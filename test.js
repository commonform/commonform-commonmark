var tape = require('tape')
var toCommonForm = require('./')

tape('quote in reference', function (test) {
  var heading = "Client's Obligations"
  var commonmark = [
    '# ' + heading,
    '[' + heading + ']()'
  ].join('\n')
  var form = {
    content: [
      {
        heading,
        form: { content: [ { reference: heading } ] }
      }
    ]
  }
  test.deepEqual(toCommonForm(commonmark).form, form)
  test.end()
})

tape('quote in definition', function (test) {
  var term = "Client's Personnel"
  var commonmark = '**' + term + '**'
  var form = { content: [ { definition: term } ] }
  test.deepEqual(toCommonForm(commonmark).form, form)
  test.end()
})

tape('quote in heading', function (test) {
  var heading = "Client's Obligations"
  var commonmark = [
    '# ' + heading,
    'first child'
  ].join('\n')
  var form = {
    content: [
      {
        heading,
        form: { content: [ 'first child' ] }
      }
    ]
  }
  test.deepEqual(toCommonForm(commonmark).form, form)
  test.end()
})

tape('preamble-heading', function (test) {
  var commonmark = [
    'The parties agree:',
    '# First',
    'first child'
  ].join('\n')
  var form = {
    content: [
      'The parties agree:',
      {
        heading: 'First',
        form: { content: [ 'first child' ] }
      }
    ]
  }
  test.deepEqual(toCommonForm(commonmark).form, form)
  test.end()
})

tape('preamble-list', function (test) {
  var commonmark = [
    'The parties agree:',
    '- first child'
  ].join('\n')
  var form = {
    content: [
      'The parties agree:',
      {
        form: {
          content: [ 'first child' ]
        }
      }
    ]
  }
  test.deepEqual(toCommonForm(commonmark).form, form)
  test.end()
})

tape('heading tree', function (test) {
  var commonmark = [
    '# A',
    'A',
    '## B',
    'B',
    '### C',
    'C',
    '# D',
    'D'
  ].join('\n')
  var form = {
    content: [
      {
        heading: 'A',
        form: {
          content: [
            'A',
            {
              heading: 'B',
              form: {
                content: [
                  'B',
                  {
                    heading: 'C',
                    form: { content: ['C'] }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        heading: 'D',
        form: { content: ['D'] }
      }
    ]
  }
  test.deepEqual(toCommonForm(commonmark).form, form)
  test.end()
})

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

  var result = toCommonForm(commonmark)
  test.deepEqual(result.form, form)
  test.deepEqual(
    result.directions,
    [
      {
        identifier: 'dollars',
        path: [ 'content', 3 ]
      }
    ]
  )
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

  test.deepEqual(toCommonForm(commonmark).form, form)
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

  test.deepEqual(toCommonForm(commonmark).form, form)
  test.end()
})
