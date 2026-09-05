import assert from 'nanoassert'
import * as commonmark from 'commonmark'
import fixStrings from 'commonform-fix-strings'
import grayMatter from 'gray-matter'
import legalVersioningRegExp from 'legal-versioning-regexp' with { type: 'json' }

const VERSION_SUFFIX_RE = new RegExp('/' + legalVersioningRegExp + '$')

export default markdown => {
  assert(typeof markdown === 'string')
  const split = grayMatter(markdown)
  const parser = new commonmark.Parser()
  const parsed = parser.parse(split.content)
  const walker = parsed.walker()
  const form = emptyForm()
  const contentStack = [form]
  const childStack = [null] // Root form is not a child.
  const contextStack = []
  let event
  let lastHeadingLevel = 0

  const UNSUPPORTED_TYPES = [
    'block_quote',
    'code_block',
    'image',
    'thematic_break'
  ]

  let currentForm
  while ((event = walker.next())) {
    const node = event.node
    const type = node.type
    const literal = node.literal
    if (UNSUPPORTED_TYPES.indexOf(type) !== -1) {
      throw new Error('Unsupported: ' + type)
    }
    if (type === 'text' || type === 'code' || type === 'softbreak') {
      handleText(literal, node)
    } else if (type === 'html_block' || type === 'html_inline') {
      if (
        literal &&
        literal.startsWith('<!--') &&
        literal.endsWith('-->')
      ) continue
      throw new Error('Unsupported: ' + node.type)
    } else if (event.entering) {
      if (type === 'item') {
        unshiftChild()
      } else if (type === 'strong') {
        addContentElement({ definition: '' })
      } else if (type === 'emph') {
        addContentElement({ use: '' })
      } else if (type === 'link') {
        addContentElement({ placeholder: true })
      } else if (type === 'heading') {
        const level = node.level
        if (level === lastHeadingLevel) {
          shiftChild()
        } else if (level > lastHeadingLevel) {
          const depth = level - lastHeadingLevel
          if (depth > 1) throw new Error('Jump in heading levels')
        } else if (level < lastHeadingLevel) {
          for (let i = level; i <= lastHeadingLevel; i++) {
            shiftChild()
          }
        }
        unshiftChild()
        lastHeadingLevel = level
      }
      contextStack.unshift({ type, level: node.level || undefined })
    } else {
      if (
        type === 'item' ||
        type === 'strong' ||
        type === 'emph' ||
        type === 'link'
      ) {
        shiftChild()
      }
      contextStack.shift()
    }
  }

  function shiftChild () {
    contentStack.shift()
    childStack.shift()
  }

  function unshiftChild () {
    const child = { form: emptyForm() }
    currentForm = contentStack[0]
    currentForm.content.push(child)
    contentStack.unshift(child.form)
    childStack.unshift(child)
  }

  function addContentElement (element) {
    const currentForm = contentStack[0]
    currentForm.content.push(element)
    contentStack.unshift(element)
    childStack.unshift(null)
  }

  function handleText (text, node) {
    assert(typeof node === 'object')
    assert(typeof node.type === 'string')
    assert(typeof node.literal === 'string' || node.type === 'softbreak')
    assert(node.type === 'text' || node.type === 'code' || node.type === 'softbreak')
    const contextType = contextStack[0].type
    if (contextType === 'heading') {
      const currentChild = childStack[0]
      if (!currentChild.heading) currentChild.heading = text
      else currentChild.heading += text
    } else if (contextType === 'strong') {
      contentStack[0].definition += text
    } else if (contextType === 'emph') {
      contentStack[0].use += text
    } else if (contextType === 'link') {
      const first = contentStack[0]
      delete first.placeholder
      if (first.link) {
        first.link += text
      } else if (first.reference) {
        first.reference += text
      } else if (text.startsWith('https://') || text.startsWith('http://')) {
        first.link = text
      } else {
        first.reference = text
      }
    } else if (contextType === 'paragraph') {
      if (node.type === 'code') {
        // Insert the label into the blank for now.
        // `extractDirections` will separate it later.
        contentStack[0].content.push({ blank: text })
      } else {
        contentStack[0].content.push(text)
      }
    } else if (contextType === 'softbreak') {
      contentStack[0].content.push(' ')
    } else {
      assert(false, 'Unknown Context Type: ' + contextType)
    }
  }

  recursivelyFixStrings(form)
  recursivelyPromoteComponents(form)
  recursivelyMarkConspicuous(form)
  recursivelyRemoveHeadings(form)
  recursivelyHandleContinuations(form)
  const returned = extractDirections(form)
  returned.frontMatter = split.data
  return returned
}

function emptyForm () {
  return { content: [] }
}

function recursivelyFixStrings (form) {
  form.content.forEach(element => {
    if (Object.hasOwn(element, 'form')) {
      recursivelyFixStrings(element.form)
    }
  })
  fixStrings(form)
}

const BLANK_RE = /^"(?<value>[^"]+)" for blank (?<number>[1-9]?[0-9]*)$/

function recursivelyPromoteComponents (form) {
  form.content.forEach((element, index) => {
    if (!Object.hasOwn(element, 'form')) return
    const childForm = element.form
    const childContent = childForm.content
    const firstElement = childContent[0]
    const startsWithLink = firstElement && Object.hasOwn(firstElement, 'link')
    if (!startsWithLink) return recursivelyPromoteComponents(element.form)
    const { link: url } = firstElement
    const versionMatch = VERSION_SUFFIX_RE.exec(url)
    if (!versionMatch) {
      throw new Error('Invalid component URL: ' + url)
    }
    const component = {
      component: url.replace(VERSION_SUFFIX_RE, ''),
      version: versionMatch[0].slice(1),
      substitutions: {
        terms: {},
        headings: {},
        blanks: {}
      }
    }
    if (element.heading) component.heading = element.heading
    const secondElement = childContent[1]
    if (secondElement) {
      if (secondElement !== ' substituting:') return fail()
      const remainder = childContent.slice(2)
      for (let index = 0; index < remainder.length; index++) {
        const child = remainder[index]
        if (
          typeof child !== 'object' ||
          !Object.hasOwn(child, 'form') ||
          typeof child.form !== 'object' ||
          !Object.hasOwn(child.form, 'content')
        ) return fail()
        const content = child.form.content
        const first = content[0]
        const second = content[1]
        const third = content[2]
        if (Object.hasOwn(first, 'use')) {
          if (second === ' for ' && Object.hasOwn(third, 'use')) {
            component.substitutions.terms[third.use] = first.use
          } else return fail()
        } else if (Object.hasOwn(first, 'reference')) {
          if (second === ' for ' && Object.hasOwn(third, 'reference')) {
            component.substitutions.headings[third.reference] = first.reference
          } else return fail()
        } else if (typeof first === 'string' && !second && !third) {
          const blankMatch = BLANK_RE.exec(first)
          if (!blankMatch) return fail()
          component.substitutions.blanks[parseInt(blankMatch.groups.number)] = blankMatch.groups.value
        } else {
          fail()
        }
      }
    }
    form.content[index] = component
    function fail () {
      throw new Error(
        'Invalid content after component URL: ' + url
      )
    }
  })
}

function recursivelyMarkConspicuous (form) {
  form.content.forEach(element => {
    if (!Object.hasOwn(element, 'form')) return
    const content = element.form.content
    const firstElement = content[0]
    const conspicuous = (
      typeof firstElement === 'string' &&
      firstElement.indexOf('!!!') === 0
    )
    if (conspicuous) {
      content[0] = firstElement.replace(/^!!!\s*/, '')
      element.form.conspicuous = 'yes'
    }
    recursivelyMarkConspicuous(element.form)
  })
}

function recursivelyRemoveHeadings (form) {
  form.content.forEach(element => {
    const hasForm = Object.hasOwn(element, 'form')
    const formOrComponent = hasForm || Object.hasOwn(element, 'repository')
    if (!formOrComponent) return
    const heading = element.heading
    if (heading === '(No Heading)') delete element.heading
    if (hasForm) recursivelyRemoveHeadings(element.form)
  })
}

function recursivelyHandleContinuations (form) {
  const spliceList = []
  form.content.forEach((element, index) => {
    if (!Object.hasOwn(element, 'form')) return
    const heading = element.heading
    if (heading !== '(Continuing)') {
      return recursivelyHandleContinuations(element.form)
    }
    const priorSibling = form.content[index - 1]
    element.form.content.forEach(element => {
      priorSibling.form.content.push(element)
    })
    spliceList.push(index)
    recursivelyHandleContinuations(element.form)
  })
  spliceList.forEach(index => {
    form.content.splice(index, 1)
  })
}

function extractDirections (formWithBlankLabels, directions, path) {
  directions = directions || []
  path = path || []
  const newContent = []
  formWithBlankLabels.content.forEach((element, index) => {
    const elementIsObject = typeof element === 'object'
    const elementIsBlank = (
      elementIsObject &&
      Object.hasOwn(element, 'blank')
    )
    if (elementIsBlank) {
      const label = element.blank
      newContent.push(createBlank())
      directions.push({
        label,
        blank: path.concat('content', index)
      })
    } else {
      const elementIsChild = (
        elementIsObject &&
        Object.hasOwn(element, 'form')
      )
      if (elementIsChild) {
        const childPath = path.concat('content', index, 'form')
        const result = extractDirections(element.form, directions, childPath)
        const newChild = { form: result.form }
        if (Object.hasOwn(element, 'heading')) {
          newChild.heading = element.heading
        }
        if (Object.hasOwn(element, 'conspicuous')) {
          newChild.form.conspicuous = element.form.conspicuous
        }
        newContent.push(newChild)
      } else {
        newContent.push(element)
      }
    }
  })
  const newForm = { content: newContent }
  if (Object.hasOwn(formWithBlankLabels, 'conspicuous')) {
    newForm.conspicuous = formWithBlankLabels.conspicuous
  }
  return {
    form: newForm,
    directions
  }

  function createBlank () {
    return { blank: '' }
  }
}
