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
    function (argv) {
      readInput(function (input) {
        try {
          var json = JSON.parse(input)
          var stringified = require('./').stringify(json, {})
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
