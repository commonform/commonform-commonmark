var fs = require('fs')
var glob = require('glob')
var path = require('path')
var tape = require('tape')
var module = require('../')

var examples = path.join(__dirname, 'examples', 'roundtrip')

glob.sync(path.join(examples, '*')).forEach(function (file) {
  var extname = path.extname(file)
  var basename = path.basename(file, extname)
  tape('round trip: ' + basename, function (test) {
    var source, parsed, stringified, reparsed
    if (extname === '.md') {
      test.doesNotThrow(function () {
        source = fs.readFileSync(file).toString()
        parsed = module.parse(source).form
        stringified = module.stringify(clone(parsed))
        reparsed = module.parse(stringified).form
      })
      test.deepEqual(stringified, source, 'stringified')
      test.deepEqual(reparsed, parsed, 'parsed')
    }
    if (extname === '.json') {
      test.doesNotThrow(function () {
        source = fs.readFileSync(file).toString()
        parsed = JSON.parse(source)
        stringified = module.stringify(clone(parsed))
        reparsed = module.parse(stringified).form
      })
      test.deepEqual(reparsed, parsed, 'parsed')
    }
    test.end()
  })
})

function clone (argument) {
  return JSON.parse(JSON.stringify(argument))
}
