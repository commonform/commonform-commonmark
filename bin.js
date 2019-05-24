#!/usr/bin/env node
require('yargs') // eslint-disable-line
  .scriptName('commonform-commonmark')

  .command(
    'parse',
    'parse CommonMark to Common Form',
    function (args) {
      readInput(function (buffer) {
        try {
          var parsed = require('./').parse(buffer.toString())
        } catch (error) {
          fail(error)
        }
        console.log(JSON.stringify(parsed))
        process.exit(0)
      })
    }
  )

  .command(
    'stringify',
    'stringify Common Form JSON to CommonMark',
    function (yargs) {
      return yargs.option('b', {
        alias: 'blanks',
        describe: 'JSON files with fill-in-the-blank values'
      })
    },
    function (argv) {
      readInput(function (input) {
        var blanks
        if (argv.blanks) {
          try {
            blanks = JSON.parse(require('fs').readFileSync(argv.blanks))
          } catch (error) {
            fail(error)
          }
        } else {
          blanks = {}
        }
        try {
          var json = JSON.parse(input)
          var stringified = require('./').stringify(json, blanks, {})
        } catch (error) {
          fail(error)
        }
        console.log(stringified)
        process.exit(0)
      })
    }
  )

  .version()
  .help()
  .alias('h', 'help')
  .demandCommand()
  .argv

function readInput (callback) {
  require('simple-concat')(
    process.stdin,
    function (error, buffer) {
      if (error) fail(error)
      callback(buffer)
    }
  )
}

function fail (error) {
  console.error(error)
  process.exit(1)
}
