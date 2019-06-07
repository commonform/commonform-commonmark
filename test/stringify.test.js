var bin = require('../bin')
var fs = require('fs')
var glob = require('glob')
var path = require('path')
var simpleConcat = require('simple-concat')
var stream = require('stream')
var stringify = require('../').stringify
var tape = require('tape')

var examples = path.join(__dirname, 'examples/stringify')

glob.sync(path.join(examples, '*.json'))
  .forEach(function (json) {
    var basename = path.basename(json, '.json')
    var dirname = path.dirname(json)
    var base = path.join(dirname, basename)

    tape('stringify: ' + basename, function (test) {
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

    tape('bin.js stringify stdin: ' + basename, function (test) {
      var stdin = new stream.PassThrough()
      var stdout = new stream.PassThrough()
      var stderr = new stream.PassThrough()
      var argv = [ 'stringify' ]
      var blanksPath = base + '.blanks'
      var blanks = fs.existsSync(blanksPath)
      if (blanks) argv.push('--values', blanksPath)
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
      var stdin = new stream.PassThrough()
      var stdout = new stream.PassThrough()
      var stderr = new stream.PassThrough()
      var argv = [ 'stringify', json ]
      var blanksPath = base + '.blanks'
      var blanks = fs.existsSync(blanksPath)
      if (blanks) argv.push('--values', blanksPath)
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
  var form = {
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
                                            form: { content: [ 'text' ] }
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
