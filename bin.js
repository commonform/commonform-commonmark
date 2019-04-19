#!/usr/bin/env node
var chunks = []
process.stdin
  .on('data', function (chunk) {
    chunks.push(chunk)
  })
  .once('error', function (error) {
    console.error(error)
    process.exit(1)
  })
  .once('end', function () {
    var input = Buffer.concat(chunks).toString()
    var toCommonForm = require('./')
    try {
      var form = toCommonForm(input)
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
    console.log(JSON.stringify(form))
  })
