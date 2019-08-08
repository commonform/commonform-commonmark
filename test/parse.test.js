var bin = require('../bin')
var fs = require('fs')
var glob = require('glob')
var path = require('path')
var simpleConcat = require('simple-concat')
var stream = require('stream')
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

  tape('bin.js parse stdin: ' + basename, function (test) {
    var stdin = new stream.PassThrough()
    var stdout = new stream.PassThrough()
    var stderr = new stream.PassThrough()
    var argv = ['parse']
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
    var stdin = new stream.PassThrough()
    var stdout = new stream.PassThrough()
    var stderr = new stream.PassThrough()
    var argv = ['parse', markdown]
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
        blank: ['content', 3]
      }
    ]
  )
  test.end()
})

tape('parse: front matter', function (test) {
  var commonmark = [
    '---',
    'title: Form Title',
    '---',
    '',
    'This form has front matter.'
  ].join('\n')
  var result = toCommonForm(commonmark)
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
