# How to use the "media-playback-while-not-visible" permission policy

The "media-playback-while-not-visible" permission policy is available in Chromium-based browsers starting in M137. Web developers can test the feature by enabling the correspondent feature flag or by registering for the feature's [origin trial](https://developer.chrome.com/origintrials/#/view_trial/4596486369685012481) (available until Jan 26, 2026).

## Enabling the feature

### Microsoft Edge instructions
1. Download [Microsoft Edge](https://www.microsoft.com/en-us/edge/download).
2. Navigate to edge://flags and enable the media-playback-while-not-visible permission policy.
3. Restart the browser.
4. Navigate to a test page - e.g. https://gabrielsanbrito.github.io/media-playback-while-not-visible/.
5. Test the feature by hiding the iframes while audio is being played.

### Google Chrome instructions
1. Download [Google Chrome](https://www.google.com/chrome/).
2. Navigate to chrome://flags and enable the media-playback-while-not-visible permission policy.
3. Restart the browser.
4. Navigate to a test page - e.g. https://gabrielsanbrito.github.io/media-playback-while-not-visible/.
5. Test the feature by hiding the iframes while audio is being played.

## Setting your page up for origin trials

Follow the instructions in the [official documentation](https://developer.chrome.com/docs/web-platform/origin-trials).

## Use case example

A website that wants to prevent a hidden iframe from playing media, could use this feature in the way shown below. If `audio-frame` is hidden by either setting `visibility` to `'hidden'` or by setting `display` to `'none'`, any MediaElements and AudioContexts embedded within `iframe.html` should stop playing audio.

```html
<!DOCTYPE html>
<html>
  <head>
    <title>
      media-playback-while-not-visible test page
    </title>
  </head>
  <body>
    <iframe id="audio-iframe" allow="media-playback-while-not-visible 'none'" src="iframe.html"></iframe>
  </body>
</html>
```