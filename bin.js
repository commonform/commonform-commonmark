#!/usr/bin/env node
if (module.parent) {
  module.exports = bin
} else {
  bin(
    process.stdin,
    process.stdout,
    process.stderr,
    process.argv.slice(2),
    status => process.exit(status)
  )
}

function bin (stdin, stdout, stderr, argv, done) {
  require('yargs')
    .scriptName('commonform-commonmark')

    .command(
      'parse [file]',
      'parse CommonMark to Common Form JSON',
      yargs => yargs
        .positional('file', {
          describe: 'CommonMark file',
          type: 'string',
          normalize: true
        })
        .option('o', {
          alias: 'only',
          describe: 'limit output',
          choices: ['form', 'directions']
        }),
      args => {
        readInput(args, buffer => {
          let parsed
          try {
            parsed = require('./').parse(buffer.toString())
          } catch (error) {
            return fail(error)
          }
          let output = parsed
          if (args.only) output = parsed[args.only]
          stdout.write(JSON.stringify(output) + '\n')
          done(0)
        })
      }
    )

    .command(
      'stringify [file]',
      'stringify Common Form JSON to CommonMark',
      yargs => yargs
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
        }),
      args => {
        readInput(args, input => {
          let blanks
          if (args.values) {
            try {
              blanks = require('commonform-prepare-blanks')(
                args.values, args.directions
              )
            } catch (error) {
              return fail(error)
            }
          } else {
            blanks = []
          }
          const options = {}
          if (args.title) options.title = args.title
          if (args['form-version']) options.version = args['form-version']
          if (args.ordered) options.ordered = true
          if (args['front-matter']) options.frontMatter = true
          if (args.ids) options.ids = true
          let json, stringified
          try {
            json = JSON.parse(input)
            stringified = require('./')
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
    const input = args.file
      ? require('fs').createReadStream(args.file)
      : stdin
    require('simple-concat')(input, (error, buffer) => {
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
