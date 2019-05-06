var assert = require('assert')
var commonmark = require('commonmark')
var fixStrings = require('commonform-fix-strings')

module.exports = function (markdown) {
  assert(typeof markdown === 'string')
  var parser = new commonmark.Parser()
  var parsed = parser.parse(markdown)
  var walker = parsed.walker()
  var returned = emptyForm()
  var formStack = [returned]
  var childStack = [null] // Root form is not a child.
  var contextStack = []
  var event
  var lastHeadingLevel = 0

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
    var childForm, child
    if (type === 'text' || type === 'code') {
      handleText(node.literal, node)
    } else if (type === 'softbreak') {
      handleText(' ', node)
    } else if (event.entering) {
      var currentForm
      if (type === 'item') {
        currentForm = formStack[0]
        childForm = emptyForm()
        child = { form: childForm }
        currentForm.content.push(child)
        formStack.unshift(childForm)
        childStack.unshift(child)
      } else if (type === 'strong') {
        currentForm = formStack[0]
        var definition = { definition: '' }
        currentForm.content.push(definition)
        formStack.unshift(definition)
        childStack.unshift(null)
      } else if (type === 'emph') {
        currentForm = formStack[0]
        var use = { use: '' }
        currentForm.content.push(use)
        formStack.unshift(use)
        childStack.unshift(null)
      } else if (type === 'link') {
        currentForm = formStack[0]
        var reference = { reference: '' }
        currentForm.content.push(reference)
        formStack.unshift(reference)
        childStack.unshift(null)
      } else if (type === 'heading') {
        var level = node.level
        if (level === lastHeadingLevel) {
          formStack.shift()
          childStack.shift()
        } else if (level > lastHeadingLevel) {
          var depth = level - lastHeadingLevel
          if (depth > 1) throw new Error('Jump in heading levels')
        } else if (level < lastHeadingLevel) {
          for (var i = level; i <= lastHeadingLevel; i++) {
            formStack.shift()
            childStack.shift()
          }
        }
        currentForm = formStack[0]
        childForm = emptyForm()
        child = { form: childForm }
        currentForm.content.push(child)
        formStack.unshift(childForm)
        childStack.unshift(child)
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
        formStack.shift()
        childStack.shift()
      }
      contextStack.shift()
    }
  }

  function handleText (text, node) {
    assert(typeof node === 'object')
    assert(typeof node.type === 'string')
    assert(typeof node.literal === 'string')
    assert(node.type === 'text' || node.type === 'code')
    var currentContext = contextStack[0]
    var currentForm = formStack[0]
    var type = currentContext.type
    if (type === 'heading') {
      var currentChild = childStack[0]
      if (!currentChild.heading) currentChild.heading = text
      else currentChild.heading += text
    } else if (type === 'strong') {
      formStack[0].definition += text
    } else if (type === 'emph') {
      use = formStack[0].use += text
    } else if (type === 'link') {
      formStack[0].reference += text
    } else if (type === 'paragraph') {
      if (node.type === 'code') {
        currentForm.content.push({ blank: '' })
      } else {
        currentForm.content.push(text)
      }
    } else {
      assert.fail('Unknown Context Type: ' + type)
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
