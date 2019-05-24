# commonform-commonmark

convert CommonMark to and from Common Form

This package includes a [JavaScript module](#JavaScript) and [command-line interface](#CLI).

## JavaScript

```javascript
var commonmark = require('commonform-commonmark')
var assert = require('assert')

var markup = [
  '# First Heading',
  'This is the **Agreement**.',
].join('\n') + '\n'

var form = {
  content: [
    {
      heading: 'First Heading',
      form: {
        content: [
          'This is the ', {definition: 'Agreement'}, '.'
        ]
      }
    }
  ]
}

assert.deepEqual(commonmark.parse(markup).form, form)
assert.deepEqual(commonmark.stringify(form), markup)
```

## CLI

```bash
npx commonform-commonmark --help
```
