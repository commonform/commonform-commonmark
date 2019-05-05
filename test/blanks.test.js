var tape = require('tape')
var toCommonForm = require('../')

tape('blank', function (test) {
  var commonmark = 'The **Purchase Price** is `dollars`.'

  var form = {
    content: [
      'The ',
      {definition: 'Purchase Price'},
      ' is ',
      {blank:''},
      '.'
    ]
  }

  test.deepEqual(toCommonForm(commonmark), form)
  test.end()
})
