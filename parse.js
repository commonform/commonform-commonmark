var URL = require('url')
var assert = require('nanoassert')
var commonmark = require('commonmark')
var fixStrings = require('commonform-fix-strings')

module.exports = function (markdown) {
  assert(typeof markdown === 'string')
  var parser = new commonmark.Parser()
  var parsed = parser.parse(markdown)
  var walker = parsed.walker()
  var form = emptyForm()
  var contentStack = [form]
  var childStack = [null] // Root form is not a child.
  var contextStack = []
  var event
  var lastHeadingLevel = 0

  var UNSUPPORTED_TYPES = [
    'block_quote',
    'code_block',
    'html_block',
    'html_inline',
    'image',
    'thematic_break'
  ]

  while ((event = walker.next())) {
    var node = event.node
    var type = node.type
    var literal = node.literal
    if (UNSUPPORTED_TYPES.indexOf(type) !== -1) {
      throw new Error('Unsupported: ' + type)
    }
    if (type === 'text' || type === 'code' || type === 'softbreak') {
      handleText(literal, node)
    } else if (event.entering) {
      var currentForm
      if (type === 'item') {
        unshiftChild()
      } else if (type === 'strong') {
        addContentElement({ definition: '' })
      } else if (type === 'emph') {
        addContentElement({ use: '' })
      } else if (type === 'link') {
        addContentElement({ reference: '' })
      } else if (type === 'heading') {
        var level = node.level
        if (level === lastHeadingLevel) {
          shiftChild()
        } else if (level > lastHeadingLevel) {
          var depth = level - lastHeadingLevel
          if (depth > 1) throw new Error('Jump in heading levels')
        } else if (level < lastHeadingLevel) {
          for (var i = level; i <= lastHeadingLevel; i++) {
            shiftChild()
          }
        }
        unshiftChild()
        lastHeadingLevel = level
      }
      contextStack.unshift({ type: type, level: node.level || undefined })
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
    var child = { form: emptyForm() }
    currentForm = contentStack[0]
    currentForm.content.push(child)
    contentStack.unshift(child.form)
    childStack.unshift(child)
  }

  function addContentElement (element) {
    var currentForm = contentStack[0]
    currentForm.content.push(element)
    contentStack.unshift(element)
    childStack.unshift(null)
  }

  function handleText (text, node) {
    assert(typeof node === 'object')
    assert(typeof node.type === 'string')
    assert(typeof node.literal === 'string' || node.type === 'softbreak')
    assert(node.type === 'text' || node.type === 'code' || node.type === 'softbreak')
    var contextType = contextStack[0].type
    if (contextType === 'heading') {
      var currentChild = childStack[0]
      if (!currentChild.heading) currentChild.heading = text
      else currentChild.heading += text
    } else if (contextType === 'strong') {
      contentStack[0].definition += text
    } else if (contextType === 'emph') {
      contentStack[0].use += text
    } else if (contextType === 'link') {
      contentStack[0].reference += text
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
  return extractDirections(form)
}

function emptyForm () {
  return { content: [] }
}

function recursivelyFixStrings (form) {
  form.content.forEach(function (element) {
    if (element.hasOwnProperty('form')) {
      recursivelyFixStrings(element.form)
    }
  })
  fixStrings(form)
}

function recursivelyPromoteComponents (form) {
  form.content.forEach(function (element, index) {
    if (!element.hasOwnProperty('form')) return
    var childForm = element.form
    var childContent = childForm.content
    var firstElement = childContent[0]
    var specifiesComponent = (
      firstElement &&
      firstElement.hasOwnProperty('reference') &&
      firstElement.reference.indexOf('https://') === 0
    )
    if (!specifiesComponent) return recursivelyPromoteComponents(element.form)
    var url = firstElement.reference
    var parsed = URL.parse(url)
    var pathname = parsed.pathname
    var split = pathname.split('/')
    if (split.length !== 4) {
      throw new Error('Invalid component URL: ' + url)
    }
    var component = {
      repository: parsed.hostname,
      publisher: split[1],
      project: split[2],
      edition: split[3],
      upgrade: 'yes',
      substitutions: {
        terms: {},
        headings: {}
      }
    }
    if (element.heading) component.heading = element.heading
    var secondElement = childContent[1]
    if (secondElement) {
      var parseSubstitutions
      if (secondElement === ' without upgrades') {
        delete component.upgrade
      } else if (secondElement === ' without upgrades, replacing ') {
        delete component.upgrade
        parseSubstitutions = true
      } else if (secondElement === ' replacing ') {
        parseSubstitutions = true
      } else {
        fail()
      }
      if (parseSubstitutions) {
        var remainder = childContent.slice(2)
        var length = remainder.length
        for (var offset = 0; offset < length; offset += 4) {
          if (offset + 2 >= length) fail()
          var first = remainder[offset]
          var second = remainder[offset + 1]
          var third = remainder[offset + 2]
          var fourth = remainder[offset + 3]
          if (typeof first !== 'object') fail()
          if (
            !first.hasOwnProperty('use') &&
            !first.hasOwnProperty('reference')
          ) fail()
          var typeKey = first.hasOwnProperty('use')
            ? 'use'
            : 'reference'
          if (second !== ' with ') fail()
          if (typeof third !== 'object') fail()
          if (
            !third.hasOwnProperty('use') &&
            !third.hasOwnProperty('reference')
          ) fail()
          if (!third.hasOwnProperty(typeKey)) fail()
          if (fourth) {
            if (fourth !== ', ' && fourth !== ', and ') fail()
          }
          var target = typeKey === 'use'
            ? component.substitutions.terms
            : component.substitutions.headings
          target[first[typeKey]] = third[typeKey]
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
  form.content.forEach(function (element) {
    if (!element.hasOwnProperty('form')) return
    var content = element.form.content
    var firstElement = content[0]
    if (typeof firstElement !== 'string') return
    if (firstElement.indexOf('!!!') !== 0) return
    content[0] = firstElement.replace(/^!!!\s*/, '')
    element.form.conspicuous = 'yes'
    recursivelyMarkConspicuous(element.form)
  })
}

function recursivelyRemoveHeadings (form) {
  form.content.forEach(function (element) {
    var hasForm = element.hasOwnProperty('form')
    var formOrComponent = hasForm || element.hasOwnProperty('repository')
    if (!formOrComponent) return
    var heading = element.heading
    if (heading === '(No Heading)') delete element.heading
    if (hasForm) recursivelyRemoveHeadings(element.form)
  })
}

function extractDirections (formWithBlankLabels, directions, path) {
  directions = directions || []
  path = path || []
  var newContent = []
  formWithBlankLabels.content.forEach(function (element, index) {
    var elementIsObject = typeof element === 'object'
    var elementIsBlank = (
      elementIsObject &&
      element.hasOwnProperty('blank')
    )
    if (elementIsBlank) {
      var label = element.blank
      newContent.push(createBlank())
      directions.push({
        label: label,
        blank: path.concat('content', index)
      })
    } else {
      var elementIsChild = (
        elementIsObject &&
        element.hasOwnProperty('form')
      )
      if (elementIsChild) {
        var childPath = path.concat('content', index, 'form')
        var result = extractDirections(element.form, directions, childPath)
        var newChild = { form: result.form }
        if (element.hasOwnProperty('heading')) {
          newChild.heading = element.heading
        }
        if (element.hasOwnProperty('conspicuous')) {
          newChild.form.conspicuous = element.form.conspicuous
        }
        newContent.push(newChild)
      } else {
        newContent.push(element)
      }
    }
  })
  var newForm = { content: newContent }
  if (formWithBlankLabels.hasOwnProperty('conspicuous')) {
    newForm.conspicuous = formWithBlankLabels.conspicuous
  }
  return {
    form: newForm,
    directions: directions
  }

  function createBlank () {
    return { blank: '' }
  }
}
