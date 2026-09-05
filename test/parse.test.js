import bin from '../bin.js'
import fs from 'fs'
import test from 'node:test'
import assert from 'node:assert'
import path from 'path'
import simpleConcat from 'simple-concat'
import stream from 'stream'
import { parse as toCommonForm } from '../index.js'

const examples = path.join('test', 'examples')

fs.globSync(path.join(examples, 'parse/valid/*.md')).forEach(function (markdown) {
  const basename = path.basename(markdown, '.md')

  test('parse: ' + basename, (t, done) => {
    const commonmark = fs.readFileSync(markdown).toString()
    const form = JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
    assert.deepEqual(toCommonForm(commonmark).form, form)
    done()
  })

  test('bin.js parse stdin: ' + basename, (t, done) => {
    const stdin = new stream.PassThrough()
    const stdout = new stream.PassThrough()
    const stderr = new stream.PassThrough()
    const argv = ['parse']
    bin(stdin, stdout, stderr, argv, function (status) {
      assert.equal(status, 0, 'exits 0')
      simpleConcat(stdout, function (error, buffer) {
        assert.ifError(error)
        assert.deepEqual(
          JSON.parse(buffer).form,
          JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
        )
        done()
      })
      stdout.end()
      stderr.end()
    })
    stdin.end(fs.readFileSync(markdown))
  })

  test('bin.js parse positional: ' + basename, (t, done) => {
    const stdin = new stream.PassThrough()
    const stdout = new stream.PassThrough()
    const stderr = new stream.PassThrough()
    const argv = ['parse', markdown]
    bin(stdin, stdout, stderr, argv, function (status) {
      assert.equal(status, 0, 'exits 0')
      simpleConcat(stdout, function (error, buffer) {
        assert.ifError(error)
        assert.deepEqual(
          JSON.parse(buffer).form,
          JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
        )
        done()
      })
      stdout.end()
      stderr.end()
    })
  })
})

fs.globSync(path.join(examples, 'parse/invalid/*.md')).forEach(function (markdown) {
  const basename = path.basename(markdown, '.md')
  test('parse: ' + basename, (t, done) => {
    const commonmark = fs.readFileSync(markdown).toString()
    assert.throws(function () {
      toCommonForm(commonmark)
    })
    done()
  })
})

test('parse: blank', (t, done) => {
  const commonmark = 'The **Purchase Price** is `dollars`.'
  const result = toCommonForm(commonmark)
  assert.deepEqual(
    result.directions,
    [
      {
        label: 'dollars',
        blank: ['content', 3]
      }
    ]
  )
  done()
})

test('parse: front matter', (t, done) => {
  const commonmark = [
    '---',
    'title: Form Title',
    '---',
    '',
    'This form has front matter.'
  ].join('\n')
  const result = toCommonForm(commonmark)
  assert.deepEqual(
    result,
    {
      form: { content: ['This form has front matter.'] },
      directions: [],
      frontMatter: { title: 'Form Title' }
    }
  )
  done()
})
