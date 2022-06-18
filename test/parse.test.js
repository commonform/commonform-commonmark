const bin = require('../bin')
const fs = require('fs')
const glob = require('glob')
const path = require('path')
const simpleConcat = require('simple-concat')
const stream = require('stream')
const tape = require('tape')
const toCommonForm = require('../').parse

const examples = path.join(__dirname, 'examples')

glob.sync(path.join(examples, 'parse/valid/*.md')).forEach(function (markdown) {
  const basename = path.basename(markdown, '.md')

  tape('parse: ' + basename, function (test) {
    const commonmark = fs.readFileSync(markdown).toString()
    const form = JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
    test.deepEqual(toCommonForm(commonmark).form, form)
    test.end()
  })

  tape('bin.js parse stdin: ' + basename, function (test) {
    const stdin = new stream.PassThrough()
    const stdout = new stream.PassThrough()
    const stderr = new stream.PassThrough()
    const argv = ['parse']
    bin(stdin, stdout, stderr, argv, function (status) {
      test.equal(status, 0, 'exits 0')
      simpleConcat(stdout, function (error, buffer) {
        test.ifError(error)
        test.same(
          JSON.parse(buffer).form,
          JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
        )
        test.end()
      })
      stdout.end()
      stderr.end()
    })
    stdin.end(fs.readFileSync(markdown))
  })

  tape('bin.js parse positional: ' + basename, function (test) {
    const stdin = new stream.PassThrough()
    const stdout = new stream.PassThrough()
    const stderr = new stream.PassThrough()
    const argv = ['parse', markdown]
    bin(stdin, stdout, stderr, argv, function (status) {
      test.equal(status, 0, 'exits 0')
      simpleConcat(stdout, function (error, buffer) {
        test.ifError(error)
        test.same(
          JSON.parse(buffer).form,
          JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
        )
        test.end()
      })
      stdout.end()
      stderr.end()
    })
  })
})

glob.sync(path.join(examples, 'parse/invalid/*.md')).forEach(function (markdown) {
  const basename = path.basename(markdown, '.md')
  tape('parse: ' + basename, function (test) {
    const commonmark = fs.readFileSync(markdown).toString()
    test.throws(function () {
      toCommonForm(commonmark)
    }, require(path.resolve(markdown.replace('.md', '.js'))))
    test.end()
  })
})

tape('parse: blank', function (test) {
  const commonmark = 'The **Purchase Price** is `dollars`.'
  const result = toCommonForm(commonmark)
  test.deepEqual(
    result.directions,
    [
      {
        label: 'dollars',
        blank: ['content', 3]
      }
    ]
  )
  test.end()
})

tape('parse: front matter', function (test) {
  const commonmark = [
    '---',
    'title: Form Title',
    '---',
    '',
    'This form has front matter.'
  ].join('\n')
  const result = toCommonForm(commonmark)
  test.deepEqual(
    result,
    {
      form: { content: ['This form has front matter.'] },
      directions: [],
      frontMatter: { title: 'Form Title' }
    }
  )
  test.end()
})
