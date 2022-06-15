var GitHubSlugger = require('github-slugger')
var escapeMarkdown = require('markdown-escape')
var groupSeries = require('commonform-group-series')
var has = require('has')

module.exports = function (form, values, options) {
  options = options || {}
  values = values || []
  var formDepth = options.formDepth || 0
  var rendered = ''
  if (options.title && !options.frontMatter) {
    rendered += '# ' + escapeMarkdown(options.title) + '\n\n'
    formDepth++
  }
  if (options.version && !options.frontMatter) {
    rendered += escapeMarkdown(options.version) + '\n\n'
  }
  if (options.frontMatter) {
    rendered += '---\n'
    if (options.title) rendered += 'title: ' + options.title + '\n'
    if (options.version) rendered += 'version: ' + options.version + '\n'
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
  var groups = groupSeries(form)
  var conspicuousMarker = ''
  if (form.conspicuous) {
    conspicuousMarker = form.conspicuous ? '!!!' : ''
    if (groups[0].type === 'paragraph') conspicuousMarker += ' '
    else conspicuousMarker += '\n\n'
  }
  return conspicuousMarker + groups
    .map(function (group, index) {
      if (group.type === 'paragraph') {
        return (
          (
            (indentationLevel || index === 0)
              ? ''
              : (headingFor(formDepth, '(Continuing)', true, options) + '\n\n')
          ) +
          group.content
            .map(function (element) {
              var realIndex = form.content.indexOf(element)
              var address = formAddress.concat('content', realIndex)
              return run(element, address, values, options)
            })
            .join('')
        )
      } else { // series
        if (!indentationLevel) {
          indentationLevel = group.content.every(function (element) {
            return !containsAHeading(element)
          }) ? 1 : 0
        }
        var nextFormDepth = formDepth + 1
        return group.content
          .map(
            indentationLevel > 0
              ? function makeListItem (child, index) {
                var body
                if (child.form) {
                  var firstElement = child.form.content[0]
                  var startsWithSeries = (
                    typeof firstElement !== 'string' &&
                    has(firstElement, 'form')
                  )
                  var realIndex = form.content.indexOf(child)
                  var address = formAddress.concat(
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
                  body = stringifyComponent(child, indentationLevel+ 1)
                }
                var prefix = '-'
                if (options.ordered) {
                  prefix = (index + 1) + '.'
                }
                return (
                  new Array(indentationLevel).join('    ') +
                  prefix +
                  (startsWithSeries ? '\n\n' : ' ') +
                  body
                )
              }
              : function makeHeadings (child) {
                var body
                if (child.form) {
                  var realIndex = form.content.indexOf(child)
                  var address = formAddress.concat(
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
  var returned
  returned = '<'
  returned += component.component
  if (!returned.endsWith('/')) returned += '/'
  returned += component.version
  returned += '>'
  var substitutions = component.substitutions
  var hasSubstitutions = (
    Object.keys(substitutions.terms).length > 0 ||
    Object.keys(substitutions.headings).length > 0 ||
    Object.keys(substitutions.blanks).length > 0
  )
  if (hasSubstitutions) {
    var indent = indentationLevel === 0 ? '' : new Array(indentationLevel).join('  ')
    returned += ' substituting:\n'
    returned += []
      .concat(
        Object.keys(substitutions.terms).map(function (from) {
          var to = substitutions.terms[from]
          return indent + '- _' + to + '_ for _' + from + '_'
        })
      )
      .concat(
        Object.keys(substitutions.headings).map(function (from) {
          var to = substitutions.headings[from]
          return indent + '- [' + to + ']() for [' + from + ']()'
        })
      )
      .concat(
        Object.keys(substitutions.blanks).map(function (index) {
          var value = substitutions.blanks[index]
          return indent + '- "' + value + '" for blank ' + (parseInt(index))
        })
      )
      .join('\n')
  }
  return returned
}

function formatHeading (formDepth, text) {
  if (formDepth <= 6) {
    return new Array(formDepth + 1).join('#') + ' ' + text
  }
  throw new Error('Form indented too deep.')
}

function headingFor (formDepth, heading, suppressAnchor, options) {
  if (heading) {
    var returned = ''
    if (!suppressAnchor && options.headingSlugger) {
      var slug = options.headingSlugger.slug(heading)
      returned += '<a id="' + slug + '"></a>\n'
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
      child.form.content.some(function (element) {
        return (
          has(element, 'form') &&
          containsAHeading(element)
        )
      })
    )
  )
}

function run (element, address, values, options) {
  if (typeof element === 'string') {
    return escapeMarkdown(element)
  } else if (has(element, 'use')) {
    return '_' + escapeMarkdown(element.use) + '_'
  } else if (has(element, 'definition')) {
    return '**' + escapeMarkdown(element.definition) + '**'
  } else if (has(element, 'blank')) {
    var value
    var match = values.find(function (element) {
      return sameAddress(element.blank, address)
    })
    if (match) value = match.value
    return value || '``'
  } else if (has(element, 'reference')) {
    var heading = element.reference
    options.referenceSlugger.reset()
    var slug = options.referenceSlugger.slug(heading)
    return '[' + heading + '](#' + slug + ')'
  } else {
    throw new Error('Invalid type: ' + JSON.stringify(element))
  }
}

function sameAddress (a, b) {
  if (a.length !== b.length) return false
  for (var index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return false
  }
  return true
}
