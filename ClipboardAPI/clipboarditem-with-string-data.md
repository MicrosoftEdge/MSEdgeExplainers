# How to create ClipboardItem with DOMString
**Last updated: October, 2024**

ClipboardItem constructor extends support to string data. ClipboardItem data can now be a blob, a string, or a promise that resolves to either a blob or a string. 

The feature is available in Chromium-based browsers in M132 or later behind the flag `ClipboardItemWithDOMStringSupport`

1. Download Microsoft Edge ([Canary Channel](https://www.microsoftedgeinsider.com/en-us/download/canary)).
2. Launch Edge with the command line flag `--enable-blink-features=ClipboardItemWithDOMStringSupport`.

This enhancement allows web authors to directly write text data to the clipboard as a string, without needing to create a blob.

```javascript
const data = new ClipboardItem({ 
  "text/plain": "Hello World", // DOMString
  "text/html": Promise.resolve("<h1>Hello World</h1>") // Promise<DOMString>
});
```

If the flag is not enabled, a blob is required for the same.

```javascript
const data = new ClipboardItem({ 
  "text/plain": new Blob(["Hello World"], {type: 'text/plain'}),
  "text/html": new Blob(["<h1>Hello World</h1>"], {type: 'text/html'})
});
```

Here is an example of writing a ClipboardItem with different supported data types. 

## Example

```javascript
async function writeToClipboard() {
  try {
    const plain_string = "Hello World";
    const html_string_promise = Promise.resolve("<h1>Hello World</h1>");
    const png_blob_promise = await fetch("/url/to/a/png/image").blob();

    const data = new ClipboardItem({ 
      "text/plain": plain_string, 
      "text/html": html_string_promise,
      "image/png": png_blob_promise
    });

    await navigator.clipboard.write([data]);
    console.log('Data copied to clipboard');
  } catch (e) {
    console.error(e.message);
  }
}
```