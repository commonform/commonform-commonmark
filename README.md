# commonform-commonmark

convert CommonMark to and from Common Form

This package includes a [JavaScript module](#JavaScript) and [command-line interface](#CLI).

## JavaScript

```javascript
var commonmark = require('commonform-commonmark')
var assert = require('assert')

// Parse markup to Common Form.
assert.deepStrictEqual(
  commonmark.parse(
    [
      '# Purchase Price',
      'The purchase price is $10.'
    ].join('\n')
  ).form,
  {
    content: [
      {
        heading: 'Purchase Price',
        form: { content: [ 'The purchase price is $10.' ] }
      }
    ]
  }
)

// Extract fill-in-the-blank directions.
assert.deepStrictEqual(
  commonmark.parse(
    [
      '# Purchase Price',
      'The purchase price is `dollars`.'
    ].join('\n')
  ).directions,
  [
    {
      label: 'dollars',
      blank: [ 'content', 0, 'form', 'content', 1 ]
    }
  ]
)

// Stringify Common Form to CommonMark.
assert.deepStrictEqual(
  commonmark.stringify({
    content: [
      'The ',
      { definition: 'Purchase Price' },
      ' is $10.'
    ]
  }),
  'The **Purchase Price** is $10.\n'
)
```

## CLI

```bash
npx commonform-commonmark --help
```
