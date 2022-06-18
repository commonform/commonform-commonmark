const fs = require('fs')
const glob = require('glob')
const path = require('path')
const tape = require('tape')
const module = require('../')

const examples = path.join(__dirname, 'examples', 'roundtrip')

glob.sync(path.join(examples, '*')).forEach(function (file) {
  const extname = path.extname(file)
  const basename = path.basename(file, extname)
  tape('round trip: ' + basename, function (test) {
    let source, parsed, stringified, reparsed
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
