var tape = require('tape')
var toCommonForm = require('./')

tape('component', function (test) {
  var commonmark = [
    '# First Heading',
    'first content',
    '',
    '<component',
    '  heading="Copyright License"',
    '  repository="api.commonform.org"',
    '  publisher="kemitchell"',
    '  project="orthodox-software-copyright-license"',
    '  edition="1e"',
    '  upgrade="yes" >',
    '  <term component="Licensor" form="Vendor">',
    '  <term component="Licensee" form="Customer">',
    '  <term component="Program" form="Software">',
    '  <heading component="Express Warranties" form="Guarantees">',
    '</component>'
  ].join('\n')
  var form = {
    content: [
      {
        heading: 'First Heading',
        form: { content: ['first content'] }
      },
      {
        heading: 'Copyright License',
        repository: 'api.commonform.org',
        publisher: 'kemitchell',
        project: 'orthodox-software-copyright-license',
        edition: '1e',
        upgrade: 'yes',
        substitutions: {
          terms: {
            'Licensor': 'Vendor',
            'Licensee': 'Customer',
            'Program': 'Software'
          },
          headings: {
            'Express Warranties': 'Guarantees'
          }
        }
      }
    ]
  }
  test.deepEqual(toCommonForm(commonmark).form, form)
  test.end()
})

tape('component missing repository', function (test) {
  var commonmark = [
    '# First Heading',
    'first content',
    '',
    '<component',
    '  heading="Copyright License"',
    // repository="api.commonform.org"
    '  publisher="kemitchell"',
    '  project="orthodox-software-copyright-license"',
    '  edition="1e"',
    '  upgrade="yes" >',
    '</component>'
  ].join('\n')
  test.throws(function () {
    toCommonForm(commonmark)
  }, /invalid component/i)
  test.end()
})

tape('component invalid upgrade', function (test) {
  var commonmark = [
    '# First Heading',
    'first content',
    '',
    '<component',
    '  heading="Copyright License"',
    '   repository="api.commonform.org"',
    '  publisher="kemitchell"',
    '  project="orthodox-software-copyright-license"',
    '  edition="1e"',
    '  upgrade="INVALID" >',
    '</component>'
  ].join('\n')
  test.throws(function () {
    toCommonForm(commonmark)
  }, /invalid component/i)
  test.end()
})
tape('invalid HTML', function (test) {
  var commonmark = [
    '# First Heading',
    'first content',
    '',
    '<div>some text</div>'
  ].join('\n')
  test.throws(function () {
    toCommonForm(commonmark)
  })
  test.end()
})

tape('invalid HTML within component', function (test) {
  var commonmark = [
    '# First Heading',
    'first content',
    '',
    '<component',
    '  heading="Copyright License"',
    '  repository="api.commonform.org"',
    '  publisher="kemitchell"',
    '  project="orthodox-software-copyright-license"',
    '  edition="1e"',
    '  upgrade="yes" >',
    '  <term component="Licensor" form="Vendor">',
    '  <term component="Licensee" form="Customer">',
    '  <term component="Program" form="Software">',
    '  <invalid></invalid>',
    '</component>'
  ].join('\n')
  test.throws(function () {
    toCommonForm(commonmark)
  }, /Invalid Tag in Component: invalid/)
  test.end()
})

tape('component term missing form attribute', function (test) {
  var commonmark = [
    '# First Heading',
    'first content',
    '',
    '<component',
    '  heading="Copyright License"',
    '  repository="api.commonform.org"',
    '  publisher="kemitchell"',
    '  project="orthodox-software-copyright-license"',
    '  edition="1e"',
    '  upgrade="yes" >',
    '  <term component="Licensor">',
    '</component>'
  ].join('\n')
  test.throws(function () {
    toCommonForm(commonmark)
  }, /term tag missing "form" attribute/)
  test.end()
})

tape('component term missing component attribute', function (test) {
  var commonmark = [
    '# First Heading',
    'first content',
    '',
    '<component',
    '  heading="Copyright License"',
    '  repository="api.commonform.org"',
    '  publisher="kemitchell"',
    '  project="orthodox-software-copyright-license"',
    '  edition="1e"',
    '  upgrade="yes" >',
    '  <term form="Licensor">',
    '</component>'
  ].join('\n')
  test.throws(function () {
    toCommonForm(commonmark)
  }, /term tag missing "component" attribute/)
  test.end()
})

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
        label: 'dollars',
        blank: [ 'content', 3 ]
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
