var fs = require('fs')
var glob = require('glob')
var path = require('path')
var stringify = require('../').stringify
var tape = require('tape')

var examples = path.join(__dirname, 'examples/stringify')

glob.sync(path.join(examples, '*.json'))
  .forEach(function (json) {
    var basename = path.basename(json, '.json')
    tape('stringify: ' + basename, function (test) {
      var dirname = path.dirname(json)
      var base = path.join(dirname, basename)
      var blanks = fs.existsSync(base + '.blanks')
        ? JSON.parse(fs.readFileSync(base + '.blanks'))
        : undefined
      var options = fs.existsSync(base + '.options')
        ? JSON.parse(fs.readFileSync(base + '.options'))
        : undefined
      test.equal(
        stringify(require(base + '.json'), blanks, options),
        fs.readFileSync(base + '.md').toString()
      )
      test.end()
    })
  })
