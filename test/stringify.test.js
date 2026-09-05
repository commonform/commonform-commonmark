import bin from '../bin.js'
import test from 'node:test'
import assert from 'node:assert'
import fs from 'fs'
import path from 'path'
import simpleConcat from 'simple-concat'
import stream from 'stream'
import { stringify } from '../index.js'

const examples = path.join('test', 'examples', 'stringify')

fs.globSync(path.join(examples, '*.json'))
  .forEach(function (json) {
    const basename = path.basename(json, '.json')
    const dirname = path.dirname(json)
    const base = path.join(dirname, basename)

    const options = fs.existsSync(base + '.options')
      ? JSON.parse(fs.readFileSync(base + '.options'))
      : undefined

    test('stringify: ' + basename, (t, done) => {
      const blanks = fs.existsSync(base + '.blanks')
        ? JSON.parse(fs.readFileSync(base + '.blanks'))
        : undefined
      assert.equal(
        stringify(JSON.parse(fs.readFileSync(base + '.json')), blanks, options),
        fs.readFileSync(base + '.md').toString()
      )
      done()
    })

    test('bin.js stringify stdin: ' + basename, (t, done) => {
      const stdin = new stream.PassThrough()
      const stdout = new stream.PassThrough()
      const stderr = new stream.PassThrough()
      const argv = ['stringify']
      const blanksPath = base + '.blanks'
      const blanks = fs.existsSync(blanksPath)
      if (blanks) argv.push('--values', blanksPath)
      if (options && options.ordered) argv.push('--ordered')
      if (options && options.ids) argv.push('--ids')
      if (options && options.frontMatter) argv.push('--front-matter')
      if (options && options.title) argv.push('--title', options.title)
      if (options && options.version) argv.push('--form-version', options.version)
      bin(stdin, stdout, stderr, argv, function (status) {
        assert.equal(status, 0, 'exits 0')
        simpleConcat(stdout, function (error, buffer) {
          assert.ifError(error)
          assert.deepEqual(
            buffer.toString(),
            fs.readFileSync(base + '.md').toString()
          )
          done()
        })
        stdout.end()
        stderr.end()
      })
      stdin.end(fs.readFileSync(json))
    })

    test('bin.js stringify positional: ' + basename, (t, done) => {
      const stdin = new stream.PassThrough()
      const stdout = new stream.PassThrough()
      const stderr = new stream.PassThrough()
      const argv = ['stringify', json]
      const blanksPath = base + '.blanks'
      const blanks = fs.existsSync(blanksPath)
      if (blanks) argv.push('--values', blanksPath)
      if (options && options.ordered) argv.push('--ordered')
      if (options && options.ids) argv.push('--ids')
      if (options && options.frontMatter) argv.push('--front-matter')
      if (options && options.title) argv.push('--title', options.title)
      if (options && options.version) argv.push('--form-version', options.version)
      bin(stdin, stdout, stderr, argv, function (status) {
        assert.equal(status, 0, 'exits 0')
        simpleConcat(stdout, function (error, buffer) {
          assert.ifError(error)
          assert.deepEqual(
            buffer.toString(),
            fs.readFileSync(base + '.md').toString()
          )
          done()
        })
        stdout.end()
        stderr.end()
      })
    })
  })

test('stringify:too deep', (t, done) => {
  const form = {
    content: [
      {
        heading: '1',
        form: {
          content: [
            {
              heading: '2',
              form: {
                content: [
                  {
                    heading: '3',
                    form: {
                      content: [
                        {
                          heading: '4',
                          form: {
                            content: [
                              {
                                heading: '5',
                                form: {
                                  content: [
                                    {
                                      heading: '6',
                                      form: {
                                        content: [
                                          {
                                            heading: '7',
                                            form: { content: ['text'] }
                                          }
                                        ]
                                      }
                                    }
                                  ]
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
  assert.throws(function () {
    stringify(form)
  }, /deep/)
  done()
})
