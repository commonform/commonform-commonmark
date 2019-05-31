# commonform-commonmark

convert [CommonMark](https://commonmark.org/) to and from [Common Form](https://www.npmjs.com/package/commonform-validate)

This package is the bridge between the way most people write legal terms for Common Form, and the internal data format that Common Form tools use to analyze, format, and share.

For a very short introduction to the syntax, see [type.commonform.org](https://type.commonform.org).

This package includes a [JavaScript module](#JavaScript) and [command-line interface](#CLI).

## JavaScript

```javascript
var commonmark = require('commonform-commonmark')
var assert = require('assert')
```

### Parse CommonMark to Common Form.

```javascript
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
```

### Extract fill-in-the-blank directions.

```javascript
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
```

### Stringify Common Form to CommonMark.

```javascript
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
