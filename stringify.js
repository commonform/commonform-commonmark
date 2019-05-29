var escapeMarkdown = require('markdown-escape')
var groupSeries = require('commonform-group-series')

module.exports = function (form, options) {
  options = options || {}
  var formDepth = options.formDepth || 0
  var rendered = render(form, formDepth)
  return rendered.trim() + '\n'
}

function render (form, formDepth, indentation) {
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
              : (headingFor(formDepth, '(Continuing)', true) + '\n')
          ) +
          group.content
            .map(function (element) {
              return run(element)
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
                  body = render(
                    child.form,
                    nextFormDepth,
                    indentation + 2
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
                  body = render(child.form, nextFormDepth, 0)
                } else {
                  body = stringifyComponent(child)
                }
                return (
                  headingFor(nextFormDepth, child.heading) +
                  '\n' +
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
  return formDepth < 7
    ? (new Array(formDepth + 1).join('#') + ' ' + text)
    : ('**' + text + '**')
}

function idForHeading (heading) {
  return heading.replace(/ /g, '_')
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

function run (element) {
  if (typeof element === 'string') {
    return escapeMarkdown(element)
  } else if (element.hasOwnProperty('use')) {
    return '_' + escapeMarkdown(element.use) + '_'
  } else if (element.hasOwnProperty('definition')) {
    return '**' + escapeMarkdown(element.definition) + '**'
  } else if (element.hasOwnProperty('blank')) {
    return '``'
  } else if (element.hasOwnProperty('reference')) {
    var heading = element.reference
    return '[' + heading + '](#' + idForHeading(heading) + ')'
  } else {
    throw new Error('Invalid type: ' + JSON.stringify(element))
  }
}
