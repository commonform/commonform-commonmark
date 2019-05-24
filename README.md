# commonform-commonmark

convert CommonMark to and from Common Form

This package includes a [JavaScript module](#JavaScript) and [command-line application](#CLI).

## JavaScript

```javascript
var commonmark = require('commonform-commonmark')
var assert = require('assert')

assert.deepEqual(
  commonmark.parse(
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
npx commonform-commonmark --help
```
