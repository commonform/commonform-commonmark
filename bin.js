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
      'parse [file]',
      'parse CommonMark to Common Form JSON',
      function (yargs) {
        return yargs
          .positional('file', {
            describe: 'CommonMark file',
            type: 'string',
            normalize: true
          })
          .option('o', {
            alias: 'only',
            describe: 'limit output',
            choices: ['form', 'directions']
          })
      },
      function (args) {
        readInput(args, function (buffer) {
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
      'stringify [file]',
      'stringify Common Form JSON to CommonMark',
      function (yargs) {
        return yargs
          .positional('file', {
            describe: 'JSON file',
            type: 'string',
            normalize: true
          })
          .option('title', {
            alias: 't',
            describe: 'form title',
            type: 'string'
          })
          .option('form-version', {
            alias: 'e',
            describe: 'form version',
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
          .option('ordered', {
            alias: 'o',
            describe: 'output ordered lists',
            default: false,
            type: 'boolean'
          })
          .option('ids', {
            alias: 'i',
            describe: 'output explicit heading IDs',
            default: false,
            type: 'boolean'
          })
          .option('front-matter', {
            alias: 'm',
            describe: 'output YAML front matter',
            default: false,
            type: 'boolean'
          })
      },
      function (args) {
        readInput(args, function (input) {
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
          if (args['form-version']) options.version = args['form-version']
          if (args.ordered) options.ordered = true
          if (args['front-matter']) options.frontMatter = true
          if (args.ids) options.ids = true
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

  function readInput (args, callback) {
    var input = args.file
      ? require('fs').createReadStream(args.file)
      : stdin
    require('simple-concat')(input, function (error, buffer) {
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
