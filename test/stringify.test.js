const bin = require('../bin')
const fs = require('fs')
const glob = require('glob')
const path = require('path')
const simpleConcat = require('simple-concat')
const stream = require('stream')
const stringify = require('../').stringify
const tape = require('tape')

const examples = path.join(__dirname, 'examples/stringify')

glob.sync(path.join(examples, '*.json'))
  .forEach(function (json) {
    const basename = path.basename(json, '.json')
    const dirname = path.dirname(json)
    const base = path.join(dirname, basename)

    const options = fs.existsSync(base + '.options')
      ? JSON.parse(fs.readFileSync(base + '.options'))
      : undefined

    tape('stringify: ' + basename, function (test) {
      const blanks = fs.existsSync(base + '.blanks')
        ? JSON.parse(fs.readFileSync(base + '.blanks'))
        : undefined
      test.equal(
        stringify(require(base + '.json'), blanks, options),
        fs.readFileSync(base + '.md').toString()
      )
      test.end()
    })

    tape('bin.js stringify stdin: ' + basename, function (test) {
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
        test.equal(status, 0, 'exits 0')
        simpleConcat(stdout, function (error, buffer) {
          test.ifError(error)
          test.same(
            buffer.toString(),
            fs.readFileSync(base + '.md').toString()
          )
          test.end()
        })
        stdout.end()
        stderr.end()
      })
      stdin.end(fs.readFileSync(json))
    })

    tape('bin.js stringify positional: ' + basename, function (test) {
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
        test.equal(status, 0, 'exits 0')
        simpleConcat(stdout, function (error, buffer) {
          test.ifError(error)
          test.same(
            buffer.toString(),
            fs.readFileSync(base + '.md').toString()
          )
          test.end()
        })
        stdout.end()
        stderr.end()
      })
    })
  })

tape('stringify:too deep', function (test) {
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
  test.throws(function () {
    stringify(form)
  }, /deep/)
  test.end()
})
