import fs from 'fs'
import test from 'node:test'
import assert from 'node:assert'
import path from 'path'
import * as exported from '../index.js'

const examples = path.join('test', 'examples', 'roundtrip')

fs.globSync(path.join(examples, '*')).forEach(function (file) {
  const extname = path.extname(file)
  const basename = path.basename(file, extname)
  test('round trip: ' + basename, (t, done) => {
    let source, parsed, stringified, reparsed
    if (extname === '.md') {
      assert.doesNotThrow(function () {
        source = fs.readFileSync(file).toString()
        parsed = exported.parse(source).form
        stringified = exported.stringify(clone(parsed))
        reparsed = exported.parse(stringified).form
      })
      assert.deepEqual(stringified, source, 'stringified')
      assert.deepEqual(reparsed, parsed, 'parsed')
    }
    if (extname === '.json') {
      assert.doesNotThrow(function () {
        source = fs.readFileSync(file).toString()
        parsed = JSON.parse(source)
        stringified = exported.stringify(clone(parsed))
        reparsed = exported.parse(stringified).form
      })
      assert.deepEqual(reparsed, parsed, 'parsed')
    }
    done()
  })
})

function clone (argument) {
  return JSON.parse(JSON.stringify(argument))
}
