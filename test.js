var tape = require('tape')
var toCommonForm = require('./')

tape('blank', function (test) {
  var commonmark = 'The **Purchase Price** is `dollars`.'

  var form = {
    content: [
      'The ',
      { definition: 'Purchase Price' },
      ' is ',
      { blank: '' },
      '.'
    ]
  }

  test.deepEqual(toCommonForm(commonmark), form)
  test.end()
})

tape('nested lists', function (test) {
  var commonmark = [
    '- A',
    '  - B',
    '    - C',
    '  - D',
    '- E'
  ].join('\n')

  var form = {
    content: [
      {
        form: {
          content: [
            'A',
            {
              form: {
                content: [
                  'B',
                  { form: { content: ['C'] } }
                ]
              }
            },
            { form: { content: ['D'] } }
          ]
        }
      },
      { form: { content: ['E'] } }
    ]
  }

  test.deepEqual(toCommonForm(commonmark), form)
  test.end()
})

tape('nested ordered lists', function (test) {
  var commonmark = [
    '1.  A',
    '    1. B',
    '       1. C',
    '    2. D',
    '2. E'
  ].join('\n')

  var form = {
    content: [
      {
        form: {
          content: [
            'A',
            {
              form: {
                content: [
                  'B',
                  { form: { content: ['C'] } }
                ]
              }
            },
            { form: { content: ['D'] } }
          ]
        }
      },
      { form: { content: ['E'] } }
    ]
  }

  test.deepEqual(toCommonForm(commonmark), form)
  test.end()
})
