var fs = require('fs')
var glob = require('glob')
var path = require('path')
var tape = require('tape')
var toCommonForm = require('./')

glob.sync('examples/valid/*.md').forEach(function (markdown) {
  var basename = path.basename(markdown, '.md')
  tape(basename, function (test) {
    var commonmark = fs.readFileSync(markdown).toString()
    var form = JSON.parse(fs.readFileSync(markdown.replace('.md', '.json')))
    test.deepEqual(toCommonForm(commonmark).form, form)
    test.end()
  })
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

tape('blank', function (test) {
  var commonmark = 'The **Purchase Price** is `dollars`.'
  var result = toCommonForm(commonmark)
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
