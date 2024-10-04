# Pausing iframe media when not visible

Authors: [Gabriel Brito](https://github.com/gabrielsanbrito), [Steve Becker](https://github.com/SteveBeckerMSFT), [Sunggook Chue](https://github.com/sunggook), Ravikiran Ramachandra

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **`ACTIVE`**
* Expected venue: [Web Hypertext Application Technology Working Group (WHATWG)](https://whatwg.org/)
* Current version: **https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/IframeMediaPause/iframe_media_pausing.md**

## Introduction

Web applications that host embedded media content via iframes may wish to respond to application input by temporarily hiding the media content. These applications may not want to unload the entire iframe when it's not rendered since it could generate user-perceptible performance and experience issues when showing the media content again. At the same time, the user could have a negative experience if the media continues to play and emit audio when not rendered. This proposal aims to provide web applications with the ability to control embedded media content in such a way that guarantees their users have a good experience when the iframe's render status is changed.

## Goals

Propose a mechanism to allow embedder documents to limitedly control embedded iframe media playback based on whether the embedded iframe is rendered or not:
- When the iframe is not rendered, the embedder is able to pause the iframe media playback; and
-  When the iframe becomes rendered again, the embedder is able to resume the iframe media playback.

## Non-Goals
It is not a goal of this proposal to allow embedders to arbitrarily control when to play, pause, stop, resume, etc, the media playback of a rendered iframe.

## Use Cases
There are scenarios where a website might want to just not render an iframe. For example:
- A website, in response to an user action, might decide to temporarily not show an iframe that is playing media. However, since it is not possible to mute it, the only option is for the website to remove the iframe completely from the DOM and recreate it from scratch when it should be visible again. Since the embedded iframe can also load many resources, the iframe recreation operation might make the web page slow and spend resources unnecessarily.

## Proposed solution: media-playback-while-not-visible Permission Policy

We propose creating a new "media-playback-while-not-visible" [permission policy] that would pause any media being played by iframes which are not currently rendered. For example, this would apply whenever the iframe’s `"display"` CSS property is set to `"none"` or when the the `"visibility"` property is set to `"hidden"` or `"collapse"`.

This policy will have a default value of '*', meaning that all of the nested iframes are allowed to play media when not rendered. The example below show how this permission policy could be used to prevent all the nested iframes from playing media. By doing it this way, even other iframes embedded by "foo.media.com" shouldn’t be allowed to play media if not rendered.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>iframe pausing</title>
  </head>
  <body>
    <iframe src="https://foo.media.com" allow="media-playback-while-not-visible 'none'"></iframe>
  </body>
</html>
```

Similarly, the top-level document is also capable of setting this policy on itself by setting the `Permissions-Policy` HTTP header. In the example below, lets' consider a top-level document served by `example.com`. Given the current `Permissions-Policy` HTTP header setup, only iframes that have the same origin as the top-level document (`example.com`) will be able to enable the `media-playback-while-not-visible` policy.

`example.com`:

```HTTP
Permissions-Policy: media-playback-while-not-visible=(self)
```

```HTML
<iframe src="https://foo.media.com" allow="media-playback-while-not-visible 'none'"></iframe>
```

In this case, `example.com` serves a document that embeds an iframe with a document from `https://foo.media.com`. Since the HTTP header only allows documents from `https://example.com` to inherit `media-playback-while-not-visible`, the iframe will not be able to use the feature.

In the past, the `"execution-while-not-rendered"` and `"execution-while-out-of-viewport"` permission policies have been proposed as additions to the [Page Lifecycle API] draft specification. However, these policies freeze all iframe JavaScript execution when not rendered, which is not desirable for the featured use case. Moreover, this proposal has not been adopted or standardized.

## Interoperability with other Web API's

Given that there exists many ways for a website to render audio in the broader web platform, this proposal has points of contact with many API's. To be more specific, there are two scenarios where this interaction might happen. Let's consider an iframe, which is not allowed to play `media-playback-while-not-visible`:
- Scenario 1: When the iframe is not rendered and it attempts to play audio; and
  - Callers should treat this scenario as if they weren't allowed to start media playback. Like when the [`autoplay` permission policy] is set to `'none'` for an iframe. 
- Scenario 2: When the iframe is already playing audio and stops being rendered during media playback. 
  - Callers should treat this scenario as if the user had paused media playback. 

The following subsections covers how this proposal could interact with Web APIs that render audio.

### HTMLMediaElements

HTMLMediaElement media playback is started and paused, respectively, with the [`play()`] and [`pause()`] methods. For scenario 1, the media element shouldn't be [allowed to play] and `play()` should return a promise rejected with `"NotAllowedError"`. In this case, the website could easily handle this like shown below.

```js
const videoElem = document.querySelector("video"); 
let startPlayPromise = videoElem.play();

if (startPlayPromise !== undefined) {
  startPlayPromise
    .then(() => {
      // Start whatever you need to do only after playback
      // has begun.
    })
    .catch((error) => {
      if (error.name === "NotAllowedError") {
        showPlayButton(videoElem);
      } else {
        // Handle a load or playback error
      }
    });
}
```
<*Snippet extracted from [MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)*>

For the scenario 2, when the iframe is not rendered anymore, the user agent must run the same steps as it would if the [`pause()`](https://html.spec.whatwg.org/multipage/media.html#dom-media-pause) method was invoked on the media element. Documents should listen for the [`pause`](https://html.spec.whatwg.org/multipage/media.html#event-media-pause) events and treat it as if the user had paused it.

```js
const videoElem = document.querySelector("video"); 

videoElem.addEventListener("pause", (event) => {
  // Video has been paused, because either pause() has been called or
  // the document is not-rendered.
  console.log("Video paused");
});
```

### Web Audio API

_This Web Audio API integration is dependent on the successful specification and implementation of the new AudioContextState `"interrupted"` proposed in this [explainer][`"interrupted"`]._

The Web Audio API renders audio through an [AudioContext](https://webaudio.github.io/web-audio-api/#AudioContext) object. We propose that the `AudioContext` shouldn't be [allowed to start](https://webaudio.github.io/web-audio-api/#allowed-to-start) whenever it is not rendered and disallowed by the `media-playback-while-not-visible` policy.

For scenario 1, if the iframe is not rendered, any `AudioContext` will not be [allowed to start]. Therefore, [creating][AudioContext constructor] a new `AudioContext` should initially put it into the [`"suspended"`] state. Consequently, attempting to start playback by calling [`resume()`] shouldn't output any audio and move the `AudioContext` to the [`"interrupted"`] state. In this case, the webpage can then listen to [`statechange`] events to determine when the interruption is over.

```js
// AudioContext being created in a not rendered iframe, where
// media-playback-while-not-visible is not allowed. 
let audioCtx = new AudioContext();
let oscillator = audioCtx.createOscillator();
oscillator.connect(audioCtx.destination);

audioCtx.onStateChange = () => {
  console.log(audioCtx.state);
}

// should print 'suspended'
console.log(audioCtx.state)
oscillator.start(0);
// `audioCtx.onStateChange` should print 'interrupted'
```

Similarly, for scenario 2, when the iframe becomes not rendered during audio playback, the user agent should interrupt the `AudioContext` by moving it to the [`"interrupted"`] state. Likewise, when the interruption is over, the UA should move the `AudioContext` back to the [`"running"`] state. Webpages can monitor these transitions by listening to the [`statechange`] event.

The snippet below show this could work for scenario 2. Let's assume that the `AudioContext` in the iframe is [allowed to start]. When the web page is initialized, the `AudioContext` will be able to play audio and will transition to the [`"running"`] state. If the user clicks on the `"iframe_visibility_btn"`, the frame will get hidden and the `AudioContext` should be put in the [`"interrupted"`] state. Likewise, pressing again the button will show the iframe again and audio playback will be resumed.

```html
<!-- audio_context_iframe.html -->
<html>
  <body>
    <script>
      let audioCtx = new AudioContext();
      let oscillator = audioCtx.createOscillator();
      oscillator.connect(audioCtx.destination);

      audioCtx.onStateChange = () => {
        console.log(audioCtx.state);
      }

      oscillator.start(0);
    </script>
  </body>
</html>

<!-- Top-level document -->
<html>
  <body>
    <iframe id="media_frame"
            src="audio_context_iframe.html" 
            allow="media-playback-while-not-visible 'none'">
    </iframe>
    <button id="iframe_visibility_btn">Hide Iframe</button>
    <script>
      const BTN_HIDE_DISPLAY_NONE_STR = 'Hide Iframe';
      const BTN_SHOW_DISPLAY_NONE_STR = 'Show Iframe';
      const iframe_visibility_btn = "iframe_visibility_btn"

      let display_btn = document.getElementById(iframe_visibility_btn);
      display_btn.innerHTML = BTN_HIDE_DISPLAY_NONE_STR;
      display_btn.addEventListener('click', () => {
        if (display_btn.innerHTML == BTN_HIDE_DISPLAY_NONE_STR){
          iframe.style.setProperty('display', 'none')
          display_btn.innerHTML = BTN_SHOW_DISPLAY_NONE_STR
        } else {
          iframe.style.setProperty('display', 'block')
          display_btn.innerHTML = BTN_HIDE_DISPLAY_NONE_STR
        }
      });
    </script>
  </body>
</html>
```

### Web Speech API

The [Web Speech API] proposes a [SpeechSynthesis interface]. The latter interface allows websites to create text-to-speech output by calling [`window.speechSynthesis.speak`] with a [`SpeechSynthesisUtterance`], which represents the text-to-be-said.

For both scenarios, the iframe should listen for utterance errors when calling `window.speechSynthesis.speak()`. For scenario 1 it should fail with a [`"not-allowed"` SpeechSynthesisErrorCode]; and, for scenario 2, it should fail with an [`"interrupted"` SpeechSynthesisErrorCode].

```js
let utterance = new SpeechSynthesisUtterance('blabla');

utterance.addEventListener('error', (event) => {
  if (event.error === "not-allowed") {
    console.log("iframe is not rendered yet");
  } else if (event.error === "interrupted") {
    console.log("iframe was hidden during speak call");
  }
})

window.speechSynthesis.speak(utterance);
```

### Interoperability with autoplay

This proposal does not affect autoplay behavior unless the media-playing iframe is not rendered. If the frame is not rendered, all media playback must be paused. If a frame that is not rendered has autoplay permission, the autoplay permission should continue to be respected if/when the frame becomes rendered in the future.

### Interoperability with `execution-while-not-rendered` and `execution-while-out-of-viewport`

Both `execution-while-not-rendered` and `execution-while-out-of-viewport` permission policies should take precedence over `media-playback-while-not-visible`. Therefore, in the case that we have an iframe with colliding permissions for the same origin, `media-playback-while-not-visible` should only be considered if the iframe is allowed to execute. The user agent should perform the following checks:

1. If the origin is not [allowed to use] the [`"execution-while-not-rendered"`] feature, then:
    1. If the iframe is not [being rendered], freeze execution of the iframe context and return. 
2. If the origin is not [allowed to use] the [`"execution-while-out-of-viewport"`] feature, then:
    1. If the iframe does not intersect the [viewport], freeze execution of the iframe context and return.
3. If the origin is not [allowed to use] the [`"media-playback-while-not-visible"`](#proposed-solution-media-playback-while-not-visible-permission-policy) feature, then:
    1. If the iframe is not [being rendered], pause all media playback from the iframe context and return.

## Alternative Solutions

This section exposes some of the alternative solutions that we came across before coming up with the chosen proposal.

### Add a "muted" attribute to the HTMLIFrameElement 

Similarly to the [HTMLMediaElement.muted](https://html.spec.whatwg.org/multipage/media.html#htmlmediaelement) attribute, the [HTMLIFrameElement](https://www.w3.org/TR/2011/WD-html5-20110525/the-iframe-element.html#the-iframe-element) could have a `muted` boolean attribute. Whenever it is set, all the HTMLMediaElements – i.e., audio and video elements – embedded in the nested iframes should also be muted. As shown in the example below, this attribute could be set directly on the iframe HTML tag and dynamically modified using JavaScript.

```html
<!DOCTYPE html> 
<html> 
  <head> 
    <meta charset="utf-8"> 
    <title>iframe muting</title> 
  </head> 
  <body> 
    <iframe id="media_iframe" muted src="https://foo.media.com"></iframe> 
    <button id="mute_iframe_btn">Mute iframe</button> 
    <script> 
      function onMuteButtonPressed() { 
        media_iframe = document.getElementById("media_iframe") 
        mute_button = document.getElementById("mute_iframe_btn") 
        if(media_iframe.muted) { 
          media_iframe.muted = false 
          mute_button.innerText = "Mute iframe" 
        } else { 
          media_iframe.muted = true 
          mute_button.innerText = "Unmute iframe" 
        } 
      } 

      mute_button = document.getElementById("mute_iframe_btn") 
      mute_button.addEventListener("click", onMuteButtonPressed) 
    </script> 
  </body> 
</html> 
```

This alternative was not selected as the preferred one, because we think that pausing media playback is preferable to just muting it.

[AudioContext constructor]: https://webaudio.github.io/web-audio-api/#dom-audiocontext-audiocontext
[allowed to play]: https://html.spec.whatwg.org/multipage/media.html#allowed-to-play
[allowed to start]: https://webaudio.github.io/web-audio-api/#allowed-to-start
[allowed to use]: https://html.spec.whatwg.org/multipage/iframe-embed-object.html#allowed-to-use
[`autoplay` permission policy]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy/autoplay
[being rendered]: https://html.spec.whatwg.org/multipage/rendering.html#being-rendered
[`"execution-while-not-rendered"`]: https://wicg.github.io/page-lifecycle/#execution-while-not-rendered
[`"execution-while-out-of-viewport"`]: https://wicg.github.io/page-lifecycle/#execution-while-out-of-viewport
[`"interrupted"`]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AudioContextInterruptedState/explainer.md
[`"interrupted"` SpeechSynthesisErrorCode]: ttps://wicg.github.io/speech-api/#dom-speechsynthesiserrorcode-interrupted
[`"not-allowed"` SpeechSynthesisErrorCode]: https://wicg.github.io/speech-api/#dom-speechsynthesiserrorcode-not-allowed
[Page Lifecycle API]: https://wicg.github.io/page-lifecycle/#feature-policies
[permission policy]: https://www.w3.org/TR/permissions-policy/
[`pause()`]: https://html.spec.whatwg.org/multipage/media.html#dom-media-pause
[`play()`]: https://html.spec.whatwg.org/multipage/media.html#dom-media-play
[`SpeechSynthesisUtterance`]: https://wicg.github.io/speech-api/#speechsynthesisutterance
[SpeechSynthesis interface]: https://wicg.github.io/speech-api/#tts-section
[`statechange`]: https://webaudio.github.io/web-audio-api/#eventdef-baseaudiocontext-statechange
[`"suspended"`]: https://webaudio.github.io/web-audio-api/#dom-audiocontextstate-suspended
[`resume()`]: https://webaudio.github.io/web-audio-api/#dom-audiocontext-resume
[`"running"`]: https://webaudio.github.io/web-audio-api/#dom-audiocontextstate-running
[viewport]: https://www.w3.org/TR/CSS2/visuren.html#viewport
[Web Speech API]: https://wicg.github.io/speech-api/
[`window.speechSynthesis.speak`]: https://wicg.github.io/speech-api/#dom-speechsynthesis-speak


The [Web Speech API](https://wicg.github.io/speech-api/) proposes a [SpeechSynthesis interface](https://wicg.github.io/speech-api/#tts-section). The latter interface allows websites to create text-to-speech output by calling [`window.speechSynthesis.speak`](https://wicg.github.io/speech-api/#dom-speechsynthesis-speak) with a [`SpeechSynthesisUtterance`](https://wicg.github.io/speech-api/#speechsynthesisutterance), which represents the text-to-be-said.

For both scenarios, the iframe should listen for utterance errors when calling `window.speechSynthesis.speak()`. For scenario 1 it should fail with a [`"not-allowed" SpeechSynthesisErrorCode`](https://wicg.github.io/speech-api/#dom-speechsynthesiserrorcode-not-allowed) SpeechSyntesis error; and, for scenario 2, it should fail with an [`"interrupted" SpeechSynthesisErrorCode`](https://wicg.github.io/speech-api/#dom-speechsynthesiserrorcode-interrupted) error.