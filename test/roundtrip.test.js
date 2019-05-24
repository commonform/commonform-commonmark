var fs = require('fs')
var glob = require('glob')
var path = require('path')
var tape = require('tape')
var module = require('../')

var examples = path.join(__dirname, 'examples', 'roundtrip')

glob.sync(path.join(examples, '*')).forEach(function (file) {
  var extname = path.extname(file)
  var basename = path.basename(file, extname)
  tape(basename, function (test) {
    if (extname === '.md') {
      var commonmark = fs.readFileSync(file).toString()
      var parsed = module.parse(commonmark).form
      var stringified = module.stringify(clone(parsed))
      var reparsed = module.parse(stringified).form
      test.deepEqual(stringified, commonmark)
      test.deepEqual(reparsed, parsed)
    }
    test.end()
  })
})

function clone (argument) {
  return JSON.parse(JSON.stringify(argument))
}
