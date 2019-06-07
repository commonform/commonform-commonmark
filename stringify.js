var emojiRegEx = require('emoji-regex')()
var escapeMarkdown = require('markdown-escape')
var groupSeries = require('commonform-group-series')

module.exports = function (form, values, options) {
  options = options || {}
  values = values || []
  var formDepth = options.formDepth || 0
  var rendered = ''
  if (options.title) {
    rendered += '# ' + escapeMarkdown(options.title) + '\n\n'
    formDepth++
  }
  if (options.edition) {
    rendered += escapeMarkdown(options.edition) + '\n\n'
  }
  rendered += render(form, values, formDepth, 0, [])
  return rendered.trim() + '\n'
}

function render (form, values, formDepth, indentation, formAddress) {
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
            (indentation || index === 0)
              ? ''
              : (headingFor(formDepth, '(Continuing)', true) + '\n\n')
          ) +
          group.content
            .map(function (element) {
              var realIndex = form.content.indexOf(element)
              var address = formAddress.concat('content', realIndex)
              return run(element, address, values)
            })
            .join('')
        )
      } else { // series
        if (!indentation) {
          indentation = group.content.every(function (element) {
            return !containsAHeading(element)
          }) ? 1 : 0
        }
        var nextFormDepth = formDepth + 1
        return group.content
          .map(
            indentation > 0
              ? function makeListItem (child) {
                var firstElement = child.form.content[0]
                var startsWithSeries = (
                  typeof firstElement !== 'string' &&
                  firstElement.hasOwnProperty('form')
                )
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
                    indentation + 2,
                    address
                  )
                } else {
                  body = stringifyComponent(child)
                }
                return (
                  new Array(indentation).join(' ') +
                  '-' +
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
                    address
                  )
                } else {
                  body = stringifyComponent(child)
                }
                return (
                  headingFor(nextFormDepth, child.heading) +
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

function stringifyComponent (component) {
  var returned
  returned = '<https://commonform.org'
  returned += '/' + component.publisher
  returned += '/' + component.project
  returned += '/' + component.edition
  returned += '>'
  var substitutions = component.substitutions
  var hasSubstitutions = (
    Object.keys(substitutions.terms).length > 0 ||
    Object.keys(substitutions.headings).length > 0
  )
  if (hasSubstitutions) {
    if (!component.upgrade) returned += ' without upgrades, replacing '
    else returned += ' replacing '
    returned += []
      .concat(
        Object.keys(substitutions.terms).map(function (from) {
          var to = substitutions.terms[from]
          return '_' + from + '_ with _' + to + '_'
        })
      )
      .concat(
        Object.keys(substitutions.headings).map(function (from) {
          var to = substitutions.headings[from]
          return '[' + from + ']() with [' + to + ']()'
        })
      )
      .join(', ')
  } else {
    if (!component.upgrade) returned += ' without upgrades'
  }
  return returned
}

function formatHeading (formDepth, text) {
  if (formDepth <= 6) {
    return new Array(formDepth + 1).join('#') + ' ' + text
  }
  throw new Error('Form indented too deep.')
}

function idForHeading (heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(
      /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g,
      ''
    )
    .replace(emojiRegEx, '')
    .replace(/\s/g, '-')
}

function headingFor (formDepth, heading, suppressAnchor) {
  return heading
    ? formatHeading(formDepth, heading)
    : formatHeading(formDepth, '(No Heading)')
}

function containsAHeading (child) {
  return (
    child.hasOwnProperty('heading') ||
    child.form.content.some(function (element) {
      return (
        element.hasOwnProperty('form') &&
        containsAHeading(element)
      )
    })
  )
}

function run (element, address, values) {
  if (typeof element === 'string') {
    return escapeMarkdown(element)
  } else if (element.hasOwnProperty('use')) {
    return '_' + escapeMarkdown(element.use) + '_'
  } else if (element.hasOwnProperty('definition')) {
    return '**' + escapeMarkdown(element.definition) + '**'
  } else if (element.hasOwnProperty('blank')) {
    var value
    var match = values.find(function (element) {
      return sameAddress(element.blank, address)
    })
    if (match) value = match.value
    return value || '``'
  } else if (element.hasOwnProperty('reference')) {
    var heading = element.reference
    return '[' + heading + '](#' + idForHeading(heading) + ')'
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
