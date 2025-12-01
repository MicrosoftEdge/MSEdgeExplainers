# Introducing the `clipboardchange` Event: A New Way to Interact with the Clipboard

The `clipboardchange` event is a new web platform feature that allows web applications to respond to changes in the system clipboard in a secure and efficient manner. This document provides an overview of the feature, how to use it, and how you can participate in its development through our Origin Trial.

## The Problem: Inefficient Clipboard Polling

Modern web applications, especially rich text editors and productivity tools, often need to know what *kind* of content is on the clipboard to provide a better user experience. For example, a web-based image editor might want to enable a "Paste" button only when there's an image on the clipboard.

Previously, the only way to achieve this was to repeatedly poll the clipboard using `navigator.clipboard.read()`, which is inefficient and can have a noticeable performance impact.

## The Solution: The `clipboardchange` Event

The `clipboardchange` event provides a much more efficient and privacy-preserving solution. Instead of polling, you can now listen for an event that fires whenever the clipboard's content changes.

### Key Features

*   **Efficient:** The event is dispatched by the browser only when a change occurs, eliminating the need for polling loops.
*   **Privacy-Preserving:** For security reasons, the event **does not** expose the actual content of the clipboard. Instead, it provides an array of native MIME types for the available data (e.g., `"text/plain"`, `"image/png"`).
*   **No User Prompts:** Because no sensitive content is exposed, this API does not require a user permission prompt, leading to a smoother user experience.
*   **Focus-Aware:** The event only fires when your document has focus, preventing background pages from snooping on clipboard activity.
*   **Cross-Platform:** Works on all platforms except iOS.

## How to Use It

Using the `clipboardchange` event is as simple as adding an event listener to `navigator.clipboard`:

```javascript
if ('clipboard' in navigator && 'addEventListener' in navigator.clipboard) {
  navigator.clipboard.addEventListener('clipboardchange', event => {
    console.log('Clipboard content changed!');
    
    // The event.types property contains an array of MIME types
    console.log('Available MIME types:', event.types);

    // Example: Enable a "Paste Image" button if a PNG is on the clipboard
    const pasteImageButton = document.getElementById('paste-image-button');
    if (event.types.includes('image/png')) {
      pasteImageButton.disabled = false;
    } else {
      pasteImageButton.disabled = true;
    }
  });
} else {
  console.log('The clipboardchange event is not supported in this browser.');
}
```

## Availability: Try it with Origin Trials!

The `clipboardchange` event is currently available as an [Origin Trial](https://developer.chrome.com/docs/web-platform/origin-trials/) in Chrome and Microsoft Edge versions 140-142. This allows you to use the feature on your production site and provide valuable feedback to browser vendors before it's finalized.

To participate, you'll need to:
1.  **Register for the Origin Trial:** [Link to your Origin Trial registration page will go here].
2.  **Add the Origin Trial Token:** Once you have your token, add it to your pages via a `<meta>` tag or an HTTP header.

```html
<!-- Example of adding the token via a meta tag -->
<meta http-equiv="origin-trial" content="YOUR_TOKEN_HERE">
```

We encourage you to try it out and see how it can improve your application!

## Provide Feedback

Your feedback is crucial to the development of this feature. If you encounter any issues, have suggestions, or want to share how you're using the `clipboardchange` event, please:

**Log an issue here:** [https://github.com/w3c/clipboard-apis/issues](https://github.com/w3c/clipboard-apis/issues)

We look forward to hearing from you!

## Further Reading and References

*   [Explainer Document](./clipboard-change-event-explainer.md)
*   [Chrome Platform Status Entry](https://chromestatus.com/feature/5085102657503232)
*   [W3C Specification Proposed Changes (PR)](https://github.com/w3c/clipboard-apis/pull/239)
*   [W3C Specification (Current Editor's Draft)](https://w3c.github.io/clipboard-apis/#clipboard-event-clipboardchange)