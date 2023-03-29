# How to use the Async Clipboard API to read and write unsanitized HTML
**Last updated: March, 2023**

Reading and writing unsanitized HTML to and from the clipboard is currently available in Chromium-based browsers in 113 and later behind the flag `ClipboardUnsanitizedContent`.
1. Download Microsoft Edge ([Canary Channel](https://www.microsoftedgeinsider.com/en-us/download/canary)).
2. Launch Edge with the command line flag `--enable-blink-features=ClipboardUnsanitizedContentNavigate`.

## Example

The write method doesn't change it's shape:
```javascript
const textInput = '<style>p { color: blue; }</style><p>Hello, World!</p>';
const blobInput = new Blob([textInput], { type: 'text/html' });
const clipboardItem = new ClipboardItem({ 'text/html': blobInput });
await navigator.clipboard.write([clipboardItem]);
```

Writing unsanitized HTML to the clipboard:
```html
<style>p { color: blue; }</style><p>Hello, World!</p>
```

For reference, this would be the sanitized output:
```html
<p style="color: blue; font-size: medium; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">Hello, World!</p>
```

The read method now accepts a dictionary with the `unsanitized` keyword and the `text/html` MIME type.
```javascript
const clipboardItems = await navigator.clipboard.read({ unsanitized: ['text/html'] });
const blobOutput = await clipboardItems[0].getType('text/html');
const outputHtml = await (new Response(blobOutput)).text();
```

Reading unsanitized HTML to the clipboard:
```html
<style>p { color: blue; }</style><p>Hello, World!</p>
```

This example in full can be found in https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/ClipboardPickle/unsanitized-html-demo.html
