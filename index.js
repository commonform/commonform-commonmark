var assert = require('assert')
var commonmark = require('commonmark')
var fixStrings = require('commonform-fix-strings')
var parse5 = require('parse5')
var validate = require('commonform-validate')

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
      } else if (type === 'html_inline') {
        var component
        var parsedNode = parse5.parseFragment(literal).childNodes[0]
        if (!parsedNode) {
          // Pass on e.g. </component>.
        } else {
          var nodeName = parsedNode.nodeName
          if (nodeName === 'component') {
            unshiftComponent()
            component = childStack[0]
            var passThrough = [
              'heading', 'repository',
              'publisher', 'project',
              'edition', 'upgrade'
            ]
            parsedNode.attrs.forEach(function (attribute) {
              var name = attribute.name
              if (passThrough.indexOf(name) !== -1) {
                component[name] = attribute.value
              }
            })
            if (!validate.component(component)) {
              throw new Error('Invalid component')
            }
          } else {
            component = childStack[0]
            if (nodeName !== 'term' && nodeName !== 'heading') {
              throw new Error('Invalid Tag in Component: ' + nodeName)
            }
            try {
              var inComponent = parsedNode.attrs
                .find(function (attr) {
                  return attr.name === 'component'
                })
                .value
            } catch (error) {
              throw new Error(nodeName + ' tag missing "component" attribute.')
            }
            try {
              var inForm = parsedNode.attrs
                .find(function (attr) {
                  return attr.name === 'form'
                })
                .value
            } catch (error) {
              throw new Error(nodeName + ' tag missing "form" attribute.')
            }
            /* istanbul ignore else */
            if (nodeName === 'term') {
              component.substitutions.terms[inComponent] = inForm
            } else if (nodeName === 'heading') {
              component.substitutions.headings[inComponent] = inForm
            }
          }
        }
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
        type === 'html_inline' ||
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

  function unshiftComponent () {
    shiftChild()
    var component = { substitutions: { terms: {}, headings: {} } }
    currentForm = contentStack[0]
    currentForm.content.push(component)
    contentStack.unshift(null)
    childStack.unshift(component)
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
    } else if (
      contextType === 'html_inline'
      /*
      contextType === 'component' ||
      contextType === 'term substitution' ||
      contextType === 'heading substitution'
      */
    ) {
      // Pass.
    } else {
      assert.fail('Unknown Context Type: ' + contextType)
    }
  }

  return extractDirections(recursivelyFixStrings(form))
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

function extractDirections (formWithBlankLabels) {
  return recurse(formWithBlankLabels, [], [])

  // Recurse the AST.
  function recurse (formWithBlankLabels, directions, path) {
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
          var result = recurse(element.form, directions, childPath)
          var newChild = { form: result.form }
          if (element.hasOwnProperty('heading')) {
            newChild.heading = element.heading
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
  }

  function createBlank () {
    return { blank: '' }
  }
}
