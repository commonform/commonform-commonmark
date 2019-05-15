# commonmark-to-commonform

convert CommonMark to Common Form

This package includes a [JavaScript module](#JavaScript) and [command-line filter](#CLI).

## JavaScript

```javascript
var toCommonForm = require('commonmark-to-commonform')
var assert = require('assert')

assert.deepEqual(
  toCommonForm(
    [
      '# First Heading',
      '',
      'This is the **Agreement**.',
      '',
      '# Second Heading',
      '',
      '- Using the term _Agreement_.',
      '- Referencing [First Heading](#first-heading).',
    ].join('\n')
  ).form,
  {
    content: [
      {
        heading: 'First Heading',
        form: {
          content: [
            'This is the ', {definition: 'Agreement'}, '.'
          ]
        }
      },
      {
        heading: 'Second Heading',
        form: {
          content: [
            {
              form: {
                content: [
                  'Using the term ', {use: 'Agreement'}, '.'
                ]
              }
            },
            {
              form: {
                content: [
                  'Referencing ', {reference: 'First Heading'}, '.'
                ]
              }
            }
          ]
        }
      }
    ]
  }
)
```

## CLI

```bash
npx commonmark-to-commonform < terms.md > terms.json
```
