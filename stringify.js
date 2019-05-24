var escapeMarkdown = require('markdown-escape')
var group = require('commonform-group-series')
var resolve = require('commonform-resolve')

module.exports = function (form, values, options) {
  options = options || {}
  var formDepth = options.formDepth || 0
  var rendered = render(resolve(form, values), formDepth)
  return rendered.trim() + '\n'
}

function render (form, formDepth, indentation, conspicuous) {
  return group(form)
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
              return run(element, conspicuous)
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
              ? function makeListItem (child, index) {
                var firstElement = child.form.content[0]
                var startsWithSeries = (
                  typeof firstElement !== 'string' &&
                  firstElement.hasOwnProperty('form')
                )
                return (
                  new Array(indentation).join(' ') +
                  (index + 1) + '.' +
                  (startsWithSeries ? '\n\n' : '  ') +
                  render(
                    child.form,
                    nextFormDepth,
                    // When the <ul> number is 10 or greater,
                    // the number takes up an additional character,
                    // and we need to indent its children further.
                    indentation + 3 + index.toString().length,
                    child.conspicuous
                  )
                )
              }
              : function makeHeadings (child) {
                return (
                  headingFor(nextFormDepth, child.heading) +
                  '\n\n' +
                  render(
                    child.form,
                    nextFormDepth,
                    0,
                    child.conspicuous
                  )
                )
              }
          )
          .join('\n\n')
      }
    })
    .join('\n\n')
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

function run (element, conspicuous) {
  if (typeof element === 'string') {
    return (
      conspicuous
        ? ('**_' + escapeMarkdown(element) + '_**')
        : escapeMarkdown(element)
    )
  } else if (element.hasOwnProperty('use')) {
    return '_' + escapeMarkdown(element.use) + '_'
  } else if (element.hasOwnProperty('definition')) {
    return '**' + escapeMarkdown(element.definition) + '**'
  } else if (element.hasOwnProperty('blank')) {
    if (element.blank === undefined) {
      return escapeMarkdown('[•]')
    } else {
      return escapeMarkdown(element.blank)
    }
  } else if (element.hasOwnProperty('heading')) {
    var heading = element.heading
    if (
      element.hasOwnProperty('broken') ||
      element.hasOwnProperty('ambiguous')
    ) {
      return escapeMarkdown(heading)
    } else {
      return (
        '[' + escapeMarkdown(heading) + ']' +
        '(#' + idForHeading(heading) + ')'
      )
    }
  } else {
    throw new Error('Invalid type: ' + JSON.stringify(element))
  }
}
