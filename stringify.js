const GitHubSlugger = require('github-slugger')
const markdownEscape = require('markdown-escape')
const groupSeries = require('commonform-group-series')
const has = require('has')

module.exports = (form, values, options) => {
  options = options || {}
  values = values || []
  let formDepth = options.formDepth || 0
  let rendered = ''
  if (options.title && !options.frontMatter) {
    rendered += `# ${customEscape(options.title)}\n\n`
    formDepth++
  }
  if (options.version && !options.frontMatter) {
    rendered += customEscape(options.version) + '\n\n'
  }
  if (options.frontMatter) {
    rendered += '---\n'
    if (options.title) rendered += `title: ${options.title}\n`
    if (options.version) rendered += `version: ${options.version}\n`
    rendered += '---\n\n'
  }
  if (options.ids) {
    options.headingSlugger = new GitHubSlugger()
  }
  options.referenceSlugger = new GitHubSlugger()
  rendered += render(form, values, formDepth, 0, [], options)
  return rendered.trim() + '\n'
}

function render (form, values, formDepth, indentationLevel, formAddress, options) {
  const groups = groupSeries(form)
  let conspicuousMarker = ''
  if (form.conspicuous) {
    conspicuousMarker = form.conspicuous ? '!!!' : ''
    if (groups[0].type === 'paragraph') conspicuousMarker += ' '
    else conspicuousMarker += '\n\n'
  }
  return conspicuousMarker + groups
    .map((group, index) => {
      if (group.type === 'paragraph') {
        return (
          (
            (indentationLevel || index === 0)
              ? ''
              : (headingFor(formDepth, '(Continuing)', true, options) + '\n\n')
          ) +
          group.content
            .map(element => {
              const realIndex = form.content.indexOf(element)
              const address = formAddress.concat('content', realIndex)
              return run(element, address, values, options)
            })
            .join('')
        )
      } else { // series
        if (!indentationLevel) {
          indentationLevel = group.content.every(element => {
            return !containsAHeading(element)
          })
            ? 1
            : 0
        }
        const nextFormDepth = formDepth + 1
        return group.content
          .map(
            indentationLevel > 0
              ? (child, index) => {
                  let body
                  let startsWithSeries
                  if (child.form) {
                    const firstElement = child.form.content[0]
                    startsWithSeries = (
                      typeof firstElement !== 'string' &&
                      has(firstElement, 'form')
                    )
                    const realIndex = form.content.indexOf(child)
                    const address = formAddress.concat(
                      'content', realIndex, 'form'
                    )
                    body = render(
                      child.form,
                      values,
                      nextFormDepth,
                      indentationLevel + 1,
                      address,
                      options
                    )
                  } else {
                    body = stringifyComponent(child, indentationLevel + 1)
                  }
                  let prefix = '-'
                  if (options.ordered) {
                    prefix = (index + 1) + '.'
                  }
                  return (
                    '    '.repeat(indentationLevel - 1) +
                    prefix +
                    (startsWithSeries ? '\n\n' : ' ') +
                    body
                  )
                }
              : child => {
                let body
                if (child.form) {
                  const realIndex = form.content.indexOf(child)
                  const address = formAddress.concat(
                    'content', realIndex, 'form'
                  )
                  body = render(
                    child.form,
                    values,
                    nextFormDepth,
                    0,
                    address,
                    options
                  )
                } else {
                  body = stringifyComponent(child, 0)
                }
                return (
                  headingFor(nextFormDepth, child.heading, false, options) +
                  '\n\n' +
                  body
                )
              }
          )
          .join('\n\n')
      }
    })
    .join('\n\n')
}

function stringifyComponent (component, indentationLevel) {
  let returned
  returned = '<'
  returned += component.component
  if (!returned.endsWith('/')) returned += '/'
  returned += component.version
  returned += '>'
  const substitutions = component.substitutions
  const hasSubstitutions = (
    Object.keys(substitutions.terms).length > 0 ||
    Object.keys(substitutions.headings).length > 0 ||
    Object.keys(substitutions.blanks).length > 0
  )
  if (hasSubstitutions) {
    const indent = indentationLevel === 0 ? '' : '  '.repeat(indentationLevel - 1)
    returned += ' substituting:\n'
    returned += []
      .concat(
        Object.keys(substitutions.terms).map(from => {
          const to = substitutions.terms[from]
          return `${indent}- _${to}_ for _${from}_`
        })
      )
      .concat(
        Object.keys(substitutions.headings).map(from => {
          const to = substitutions.headings[from]
          return `${indent}- [${to}]() for [${from}]()`
        })
      )
      .concat(
        Object.keys(substitutions.blanks).map(index => {
          const value = substitutions.blanks[index]
          return `${indent}- "${value}" for blank ${parseInt(index)}`
        })
      )
      .join('\n')
  }
  return returned
}

function formatHeading (formDepth, text) {
  if (formDepth <= 6) {
    return '#'.repeat(formDepth) + ' ' + text
  }
  throw new Error('Form indented too deep.')
}

function headingFor (formDepth, heading, suppressAnchor, options) {
  if (heading) {
    let returned = ''
    if (!suppressAnchor && options.headingSlugger) {
      const slug = options.headingSlugger.slug(heading)
      returned += `<a id="${slug}"></a>\n`
    }
    return returned + formatHeading(formDepth, heading)
  } else {
    return formatHeading(formDepth, '(No Heading)')
  }
}

function containsAHeading (child) {
  return (
    has(child, 'heading') ||
    (
      child.form &&
      child.form.content.some(element => (
        has(element, 'form') &&
        containsAHeading(element)
      ))
    )
  )
}

function run (element, address, values, options) {
  if (typeof element === 'string') {
    return customEscape(element)
  } else if (has(element, 'use')) {
    return `_${customEscape(element.use)}_`
  } else if (has(element, 'definition')) {
    return `**${customEscape(element.definition)}**`
  } else if (has(element, 'blank')) {
    let value
    const match = values.find(function (element) {
      return sameAddress(element.blank, address)
    })
    if (match) value = match.value
    return value || '``'
  } else if (has(element, 'reference')) {
    const heading = element.reference
    options.referenceSlugger.reset()
    const slug = options.referenceSlugger.slug(heading)
    return `[${heading}](#${slug})`
  } else {
    throw new Error(`Invalid type: ${JSON.stringify(element)}`)
  }
}

function sameAddress (a, b) {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return false
  }
  return true
}

function customEscape (string) {
  return markdownEscape(string, ['slashes'])
}
