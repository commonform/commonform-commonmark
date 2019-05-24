var fs = require('fs')
var glob = require('glob')
var path = require('path')
var tape = require('tape')
var toCommonForm = require('./').parse

glob.sync('examples/valid/*.md').forEach(function (markdown) {
  var basename = path.basename(markdown, '.md')
  tape(basename, function (test) {
    var commonmark = fs.readFileSync(markdown).toString()
    var form = JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
    test.deepEqual(toCommonForm(commonmark).form, form)
    test.end()
  })
})

glob.sync('examples/invalid/*.md').forEach(function (markdown) {
  var basename = path.basename(markdown, '.md')
  tape(basename, function (test) {
    var commonmark = fs.readFileSync(markdown).toString()
    test.throws(function () {
      toCommonForm(commonmark)
    }, require(path.resolve(markdown.replace('.md', '.js'))))
    test.end()
  })
})

tape('blank', function (test) {
  var commonmark = 'The **Purchase Price** is `dollars`.'
  var result = toCommonForm(commonmark)
  test.deepEqual(
    result.directions,
    [
      {
        label: 'dollars',
        blank: [ 'content', 3 ]
      }
    ]
  )
  test.end()
})
