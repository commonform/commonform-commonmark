#!/usr/bin/env node
if (module.parent) {
  module.exports = cli
} else {
  cli(
    process.stdin,
    process.stdout,
    process.stderr,
    process.env,
    process.argv.slice(2),
    function (status) {
      process.exit(status)
    }
  )
}

function cli (stdin, stdout, stderr, env, argv, done) {
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
            return fail(error)
          }
          stdout.write(JSON.stringify(parsed) + '\n')
          done(0)
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
              return fail(error)
            }
          } else {
            blanks = []
          }
          try {
            var json = JSON.parse(input)
            var stringified = require('./').stringify(json, blanks, {})
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
