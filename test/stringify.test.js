var fs = require('fs')
var glob = require('glob')
var path = require('path')
var spawnSync = require('child_process').spawnSync
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

    tape('bin.js stringify: ' + basename, function (test) {
      var dirname = path.dirname(json)
      var base = path.join(dirname, basename)
      var scriptPath = path.join(__dirname, '..', 'bin.js')
      var args = [ 'stringify' ]
      var blanksPath = base + '.blanks'
      var blanks = fs.existsSync(blanksPath)
      if (blanks) args.push('--blanks', blanksPath)
      var bin = spawnSync(scriptPath, args, {
        input: fs.readFileSync(json)
      })
      test.equal(
        bin.stdout.toString(),
        fs.readFileSync(base + '.md').toString()
      )
      test.end()
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
