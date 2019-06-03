var fs = require('fs')
var glob = require('glob')
var path = require('path')
var spawnSync = require('child_process').spawnSync
var tape = require('tape')
var toCommonForm = require('../').parse

var examples = path.join(__dirname, 'examples')

glob.sync(path.join(examples, 'parse/valid/*.md')).forEach(function (markdown) {
  var basename = path.basename(markdown, '.md')

  tape('parse: ' + basename, function (test) {
    var commonmark = fs.readFileSync(markdown).toString()
    var form = JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
    test.deepEqual(toCommonForm(commonmark).form, form)
    test.end()
  })

  tape('bin.js parse: ' + basename, function (test) {
    var scriptPath = path.join(__dirname, '..', 'bin.js')
    var bin = spawnSync(scriptPath, [ 'parse' ], {
      input: fs.readFileSync(markdown)
    })
    test.same(
      JSON.parse(bin.stdout.toString()).form,
      JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
    )
    test.end()
  })
})

glob.sync(path.join(examples, 'parse/invalid/*.md')).forEach(function (markdown) {
  var basename = path.basename(markdown, '.md')
  tape('parse: ' + basename, function (test) {
    var commonmark = fs.readFileSync(markdown).toString()
    test.throws(function () {
      toCommonForm(commonmark)
    }, require(path.resolve(markdown.replace('.md', '.js'))))
    test.end()
  })
})

tape('parse: blank', function (test) {
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
