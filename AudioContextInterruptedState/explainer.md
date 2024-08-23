# AudioContext Interrupted State

## Authors:

- [Gabriel Santana Brito](https://github.com/gabrielsanbrito)
- [Steve Becker](https://github.com/SteveBeckerMSFT)

## Participate
- https://github.com/WebAudio/web-audio-api/issues/2392

## Introduction

The [Web Audio API](https://webaudio.github.io/web-audio-api/) is widely used to add advanced audio capabilities to web applications, like web-based games and music applications. One of the API's features is the [AudioContext interface](https://webaudio.github.io/web-audio-api/#AudioContext), which represents an audio graph. An `AudioContext` can find itself in one of three states: [`"suspended"`](https://webaudio.github.io/web-audio-api/#dom-audiocontextstate-suspended), [`"running"`](https://webaudio.github.io/web-audio-api/#dom-audiocontextstate-running), or [`"closed"`](https://webaudio.github.io/web-audio-api/#dom-audiocontextstate-closed). Once an `AudioContext` is in the `"running"` state, it can only pause media playback by transitioning to the `"suspended"` state when, and only when, user code calls [`suspend()`](https://webaudio.github.io/web-audio-api/#dom-audiocontext-suspend) on this `AudioContext`. However, there are situations where we might want to let the User Agent (UA) decide when to interrupt playback - e.g., the proposed [`"media-playback-while-not-visible"`](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/IframeMediaPause/iframe_media_pausing.md) permission policy and the proposed [Audio Session API](https://w3c.github.io/audio-session/); or during a phone call, where the calling application will need exclusive access to the audio hardware. To support these scenarios, we propose adding a new `"interrupted"` state to the [`AudioContextState`](https://webaudio.github.io/web-audio-api/#enumdef-audiocontextstate) enum.

## Goals

The main goal of this proposal is to allow the UA to be able to interrupt `AudioContext` playback when needed, given that there are a couple of user scenarios - e.g., incoming phone calls - and proposed web API's that could make good use of this functionality.

### "media-playback-while-not-visible" permission policy

The ["media-playback-while-not-visible" permission policy](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/IframeMediaPause/iframe_media_pausing.md) allows the UA to pause media playback on unrendered iframes. However, since the Web Audio API [does not allow the UA to suspend](https://webaudio.github.io/web-audio-api/#dom-audiocontext-suspended-by-user-slot) audio playback, the proposed permission policy has no mechanism available to pause media playback.

### Audio Session API

Similarly, the [Audio Session API](https://w3c.github.io/audio-session/) could also make use of the `"interrupted"` state. Whenever the [`AudioSessionState`](https://w3c.github.io/audio-session/#enumdef-audiosessionstate) is `"interrupted"`, the AudioContext of the document would also transition to the `"interrupted"` state. As a matter of fact, the `AudioContext`'s `"interrupted"` state has been [implemented on WebKit](https://github.com/WebKit/WebKit/blob/1e8ea6e4777297ce82e6c911caa7cce2cc32e6a9/Source/WebCore/Modules/webaudio/AudioContextState.idl) and is currently being used by the Audio Session API. 

In Safari, on MacOS Sonoma 14.5, if there an active web page with the `AudioContext` in the `"running"` state, and if we set the audio session type to `"auto"` with `navigator.audioSession.type = "auto"`; whenever the laptop's screen is locked, the AudioContext will transition to the `"interrupted"` state. When the screen is unlocked, the state will automatically switch to `"running"` again.

### Exclusive access to audio hardware

There are scenarios where another application may acquire exclusive access to audio hardware. For example, when a phone call is in progress. In this situation, if there is already an `AudioContext` in the `running` state, it makes sense that the UA pauses the `AudioContext` using the `interrupted` state while the call is in progress.

## The `"interrupted"` state

This explainer proposes adding the `"interrupted"` state to the `AudioContextState` enum, as shown below:

```js
enum AudioContextState {
    "suspended",
    "running",
    "closed",
    "interrupted"
};
```

Whenever an `AudioContext` transitions to either `"suspended"` or `"interrupted"`, audio playback would halt. The main difference between `"suspended"` and `"interrupted"` is that an `AudioContext` can only move to the `"suspended"` state if the [user triggered](https://webaudio.github.io/web-audio-api/#dom-audiocontext-suspended-by-user-slot) the state change; while the UA can transition the context to the `"interrupted"` state if there is a need for that.

With the addition of the `"interrupted"` state, the following state transitions would also be introduced:
- `"running"` -> `"interrupted"`;
  - Would happen whenever the UA needs to interrupt audio playback.
- `"suspended"` -> `"interrupted"`;
  - Shouldn't happen automatically. This transition should happen only if there is an ongoing interruption and [`AudioContext.resume()`](https://webaudio.github.io/web-audio-api/#dom-audiocontext-resume) is called.
- `"interrupted"` -> `"running"`;
  - By the time that the cause of the interruption ceases to exist, the UA can transition to `"running"` if audio playback is allowed to resume automatically.
- `"interrupted"` -> `"suspended"`; and
  - By the time that the cause of the interruption ceases to exist, the UA can transition to `"suspended"` if audio playback is **not** allowed to resume automatically or if [`AudioContext.suspend()`](https://webaudio.github.io/web-audio-api/#dom-audiocontext-suspend) has been called during the interruption.
- `"interrupted"` -> `"closed"`.
  - The `AudioContext`'s state should move immediately to `"closed"` when `AudioContext.close()` is called.

The state transition from `"suspended"` to `"interrupted"` should not happen automatically, due to privacy concerns. Doing this transition automatically every time an interruption occurs might unnecessarily expose too much information to web pages - e.g., when a phone call comes in. Given this, what should happen if an interruption happens while the `AudioContext` is in the `"suspended"` state? In this case, an internal boolean flag, let's say `"is_interrupted"`, should be set and the AudioContext should remain in the `"suspended"` state, even though it is interrupted behind the curtains. However, calling [`AudioContext.resume()`](https://webaudio.github.io/web-audio-api/#dom-audiocontext-resume) should trigger the state change from `"suspended"` to `"interrupted"` if the interruption is still active. Therefore, while in the `"suspended"` state with an ongoing interruption:
- Calling `AudioContext.resume()` would return a rejected promise and transition to the `"interrupted"` state;
- Calling `AudioContext.suspend()` is a NOOP;

Finally, while in the `"interrupted"` state:
- Calling `AudioContext.resume()` would return a rejected promise;
- Calling `AudioContext.suspend()` would change the `AudioContext`'s state to `"suspended"` and return a promise that should resolve when the `AudioContext`'s state has transitioned to `"suspended"`.
- Calling `AudioContext.close()` would return a promise that should resolve when the `AudioContext`'s state has transitioned to `"closed"`

## Key scenarios

The `"interrupted"` state can be used by a couple of proposed API's, like the [`"media-playback-while-not-visible"`](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/IframeMediaPause/iframe_media_pausing.md) permission policy and the  [Audio Session API](https://w3c.github.io/audio-session/) (this list is not exhaustive).

### "media-playback-while-not-visible" permission policy

Whenever an iframe, which has the `"media-playback-while-not-visible"` permission policy enabled, is not rendered anymore, the UA would transition the iframe's AudioContext to the `"interrupted"` state to pause audio rendering.

In the example below, we should have the following behavior:
1. When the iframe is loaded, the application should initially print `"suspended"` on the console.
2. Clicking on the "play-audio-btn" button, should start the AudioContext and `"running"` should be printed on the console.
3. Clicking on the "iframe-visibility-btn" button, should hide the iframe and `"media-playback-while-not-visible"` will interrupt the AudioContext. Thus, `"interrupted"` should be printed on the console.
4. Clicking again on the "iframe-visibility-btn" button, should show the iframe. The `"media-playback-while-not-visible"` permission policy will end the interruption and move the AudioContext to the `"running"` state. As a result, `"running"` should be printed on the console.

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <body>
    <button id="iframe-visibility-btn">Hide iframe</button>
    <div>
      <iframe id="audiocontext-iframe" src="audiocontext-iframe.html" allow="media-playback-while-not-visible 'none'; autoplay *"></iframe>
    </div>
    <script>
      const HIDE_IFRAME_BTN_STR = "Hide iframe";
      const SHOW_IFRAME_BTN_STR = "Show iframe";

      const iframe_visibility_btn = document.getElementById("iframe-visibility-btn");

      iframe_visibility_btn.addEventListener("click", () => {
      const audiocontext_iframe = document.getElementById("audiocontext-iframe");
      if (iframe_visibility_btn.textContent === HIDE_IFRAME_BTN_STR) {
        // Hide the iframe
        audiocontext_iframe.style.setProperty("display", "none");
        iframe_visibility_btn.textContent = SHOW_IFRAME_BTN_STR
      } else {
        // Show the iframe
        audiocontext_iframe.style.setProperty("display", "block");
        iframe_visibility_btn.textContent = HIDE_IFRAME_BTN_STR
      }
      });
    </script>
  </body>
</html>
```

```html
<!-- audiocontext-iframe.html -->
<!DOCTYPE html>
<html>
  <body>
    <button id="play-audio-btn">Play audio</button>
    <script>
      const audio_context = new AudioContext();
      const oscillator = audio_context.createOscillator();
      oscillator.connect(audio_context.destination);

      const play_audio_btn = document.getElementById("play-audio-btn");

      audio_context.addEventListener("statechange", () => {
        console.log(audio_context.state);
      });

      play_audio_btn.addEventListener("click", () => {
        oscillator.start();
      });

      window.addEventListener("load", () => {
        console.log(audio_context.state);
      });
    </script> 
  </body>
</html>
```

### Audio Session API

Whenever the Audio Session API needs to pause media playback, the document's active AudioContext would transition to the `"interrupted"` state. Let's say that a UA decides that the Web Audio API should not play any audio whenever the screen gets locked and the navigator's object [`AudioSessionType`](https://w3c.github.io/audio-session/#enumdef-audiosessiontype) is set to `"auto"`. Since the current Web Audio API spec does not allow the UA to transition the `AudioContext`'s state to `"suspended"`, the UA can instead move the `AudioContext` to the `"interrupted"` state. Once the interruption ends, if the UA does not resume playback automatically, the application code can monitor the `AudioContext`'s state changes and be able to call `AudioContext.resume()` when the `AudioContext` is in the `"suspended"` state. 

Given the snippet below, where the `AudioSession` type is set to `"auto"`, we would have the following behavior:
1. Page is loaded and the AudioContext is `"suspended"`.
2. After clicking on the "Play Audio" button, the `AudioContext` state will be `"running"`.
3. The screen gets locked. At this moment, based on the the Audio Session API type, the UA should interrupt the `AudioContext`, and the context's state should now be `"interrupted"`.
4. The screen gets unlocked. The UA should lift the interruption and the `AudioContext` should transition to the `"running"` state.

```js
<!DOCTYPE html>
<html>
  <body>
    <button id="play-audio-btn">Play audio</button>
    <script>
      const audio_context = new AudioContext();
      const oscillator = audio_context.createOscillator();
      oscillator.connect(audio_context.destination);

      const play_audio_btn = document.getElementById("play-audio-btn");

      audio_context.addEventListener("statechange", () => {
        console.log(audio_context.state);
      });

      play_audio_btn.addEventListener("click", () => {
        oscillator.start();
      });

      window.addEventListener("load", () => {
        navigator.audioSession.type = "auto";
        console.log(audio_context.state);
      });
    </script> 
  </body>
</html>
```

## Web compatibility risks

When `AudioContext.resume()` is called for an `AudioContext` in the `"closed"` state, the returned promise is rejected. With this proposal, the same behavior will happen when `AudioContext.resume()` is called while the `AudioContext` interrupted (could happen either during `"suspended"` or `"interrupted"`). In this case, a web page that is not aware of the existence of the "`interrupted`" state might think that the `AudioContext` has been closed.

## Privacy considerations

Moving the `AudioContexts` to the `"interrupted"` state might giveaway some information about the user's behavior - for example, when the user started a voice call or locked the screen. However, since "interrupting" an `AudioContext` could be associated with several types of interruptions, exposing this new state shouldn't be a major concern. Moreover, to mitigate privacy concerns, this proposal forbids automatically transitioning from `"suspended"` to `"interrupted"` to avoid unnecessarily exposing interruptions. This state transition will only happen if [`AudioContext.resume()`](https://webaudio.github.io/web-audio-api/#dom-audiocontext-resume) is called.

## Considered alternatives

This sections lists a number of alternatives taken into consideration prior to and during the writing of this document.

### Re-use the `"suspended"` state

We first considered in the [`"media-playback-while-not-visible"`](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/IframeMediaPause/iframe_media_pausing.md) permission policy proposal using the `"suspended"` state whenever media playback needed to be paused. However, this is not possible, because [only user code can suspend](https://webaudio.github.io/web-audio-api/#dom-audiocontext-suspended-by-user-slot) an `AudioContext`.

## Stakeholder Feedback / Opposition

- Chromium : No signals
- WebKit : Positive
  - This feature is shipped in Safari:
    - [[MDN] Resuming interrupted play states in iOS Safari](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#resuming_interrupted_play_states_in_ios_safari)
    - [[iOS] When Web Audio is interrupted by a phone call, it cannot be restarted.](https://github.com/WebKit/WebKit/commit/c2e380f844e9bbb3afea4d9ca8213f11e56a7ec4)
- Gecko : No signals

## References & acknowledgements

Many thanks for valuable feedback and advice from:
- [Erik Anderson](https://github.com/erik-anderson)
- [Sunggook Chue](https://github.com/sunggook)