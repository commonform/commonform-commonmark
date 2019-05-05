var commonmark = require('commonmark')
var fixStrings = require('commonform-fix-strings')

module.exports = function (markdown) {
  var parser = new commonmark.Parser()
  var parsed = parser.parse(markdown)
  var walker = parsed.walker()
  var returned = emptyForm()
  var formStack = [returned]
  var contextStack = []
  var event
  var lastHeadingLevel = 1

  var UNSUPPORTED_TYPES = [
    'block_quote',
    'code_block',
    'html_block',
    'image',
    'thematic_break'
  ]

  while ((event = walker.next())) {
    var node = event.node
    var type = node.type
    if (UNSUPPORTED_TYPES.indexOf(type) !== -1) {
      throw new Error('Unsupported: ' + type)
    }
    if (type === 'text' || type === 'code') {
      handleText(node.literal, node)
    } else if (type === 'softbreak') {
      handleText(' ', node)
    } else if (event.entering) {
      if (type === 'item') {
        var currentForm = formStack[0]
        var childForm = emptyForm()
        var child = { form: childForm }
        currentForm.content.push(child)
        formStack.unshift(childForm)
      }
      contextStack.unshift({ type: type, level: node.level || undefined })
    } else {
      if (type === 'item') formStack.shift()
      contextStack.shift()
    }
  }

  function handleText (text, node) {
    var currentContext = contextStack[0]
    var currentForm = formStack[0]
    var type = currentContext.type
    // Handle headings.
    if (type === 'heading') {
      var level = currentContext.level
      // Ignore document titles.
      if (level === 1) return
      if (level === lastHeadingLevel) {
        formStack.shift()
      } else if (level > lastHeadingLevel) {
        var depth = level - lastHeadingLevel
        if (depth > 1) throw new Error('Jump in heading levels')
      } else if (level < lastHeadingLevel) {
        for (var i = level; i < lastHeadingLevel; i++) {
          formStack.shift()
        }
      }
      currentForm = formStack[0]
      var childForm = emptyForm()
      var child = {
        heading: text,
        form: childForm
      }
      currentForm.content.push(child)
      formStack.unshift(childForm)
      lastHeadingLevel = level
    // Convert <strong> to definitions.
    } else if (type === 'strong') {
      currentForm.content.push({ definition: text })
    // Convert <emph> to definitions.
    } else if (type === 'emph') {
      currentForm.content.push({ use: text })
    // Convert <a> to references.
    } else if (type === 'link') {
      currentForm.content.push({ reference: text })
    // Handle plain text.
    } else if (type === 'paragraph') {
      if (node.type === 'code') {
        currentForm.content.push({blank: ''})
      } else {
        currentForm.content.push(text)
      }
    }
  }
  return recursivelyFixStrings(returned)
}

function recursivelyFixStrings (form) {
  form.content.forEach(function (element) {
    if (element.hasOwnProperty('form')) {
      recursivelyFixStrings(element.form)
    }
  })
  fixStrings(form)
  return form
}

function emptyForm () {
  return { content: [] }
}
