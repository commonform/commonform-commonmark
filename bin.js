#!/usr/bin/env node
if (module.parent) {
  module.exports = bin
} else {
  bin(
    process.stdin,
    process.stdout,
    process.stderr,
    process.argv.slice(2),
    function (status) {
      process.exit(status)
    }
  )
}

function bin (stdin, stdout, stderr, argv, done) {
  require('yargs')
    .scriptName('commonform-commonmark')

    .command(
      'parse',
      'parse CommonMark to Common Form JSON',
      function (yargs) {
        return yargs.option('o', {
          alias: 'only',
          describe: 'limit output',
          choices: [ 'form', 'directions' ]
        })
      },
      function (args) {
        readInput(function (buffer) {
          try {
            var parsed = require('./').parse(buffer.toString())
          } catch (error) {
            return fail(error)
          }
          var output = parsed
          if (args.only) output = parsed[args.only]
          stdout.write(JSON.stringify(output) + '\n')
          done(0)
        })
      }
    )

    .command(
      'stringify',
      'stringify Common Form JSON to CommonMark',
      function (yargs) {
        return yargs
          .option('title', {
            alias: 't',
            describe: 'form title',
            type: 'string'
          })
          .option('edition', {
            alias: 'e',
            describe: 'form edition',
            type: 'string'
          })
          .option('values', {
            alias: 'v',
            describe: 'JSON file with blank values',
            coerce: readJSON,
            demandOption: false
          })
          .option('directions', {
            alias: 'd',
            describe: 'JSON file with directions',
            coerce: readJSON,
            demandOption: false
          })
          .implies('directions', 'values')
      },
      function (args) {
        readInput(function (input) {
          if (args.values) {
            try {
              var blanks = require('commonform-prepare-blanks')(
                args.values, args.directions
              )
            } catch (error) {
              return fail(error)
            }
          } else {
            blanks = []
          }
          var options = {}
          if (args.title) options.title = args.title
          if (args.edition) options.edition = args.edition
          try {
            var json = JSON.parse(input)
            var stringified = require('./')
              .stringify(json, blanks, options)
          } catch (error) {
            return fail(error)
          }
          stdout.write(stringified)
          done(0)
        })
      }
    )

    .version()
    .help()
    .alias('h', 'help')
    .demandCommand()
    .parse(argv)

  function readInput (callback) {
    require('simple-concat')(stdin, function (error, buffer) {
      if (error) return fail(error)
      callback(buffer)
    })
  }

  function fail (error) {
    stderr.write(error.toString() + '\n')
    done(1)
  }
}

function readJSON (file) {
  return JSON.parse(
    require('fs').readFileSync(
      require('path').normalize(file)
    )
  )
}
