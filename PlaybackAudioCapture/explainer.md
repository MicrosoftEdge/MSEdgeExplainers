# Playback Audio Capture Without Screen Sharing

## Authors

- [Nishitha Dey](https://github.com/nishitha-burman)
- [Steve Becker](https://github.com/SteveBeckerMSFT)

## Participate

- [Proposal issue and discussion](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12)
- [MSEdgeExplainers issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues)

## Status of this Document

This document is a starting point for engaging the community and standards
bodies in developing collaborative solutions fit for standardization. As the
solutions described here progress along the standards track, we will retain
this document as an archive and update this section with the current standards
venue and content location.

- This document status: **Active**
- Expected venue: [WebRTC Working Group](https://www.w3.org/groups/wg/webrtc/)
- Current version: this document

## Introduction

Today, websites cannot capture audio playing in a browser tab, application, or
across a device without also asking the user to share their screen.

`getUserMedia()` captures microphone and camera input, while
`getDisplayMedia()` is designed for sharing a screen, window, or browser tab
and requires video. As a workaround, a website must start screen sharing, use
the audio if it is available, and discard the video track. Developers have
reported that this can add
[unnecessary processing](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12#issuecomment-1960941133),
[hurt performance](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12#issuecomment-1960941077),
and
[confuse users](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12#issuecomment-1960941098)
who are asked to share visual content for an audio-only feature.

Even if the website immediately stops the video track, the user must approve
screen sharing first. This exposes more information than an audio-only feature
needs and makes the permission request harder to understand.

This document proposes allowing users to share **playback audio**—audio played
by a browser tab, application, or the device—without sharing screen pixels. The
browser lets the user choose from supported sources, such as a browser tab,
application, or system audio where available. The website receives a standard
audio track that it can record, process, or share.

This document considers two API options:

1. Allow `getDisplayMedia()` to return an audio-only stream.
2. Add a new `getPlaybackMedia()` method.

Each option returns an audio track that works with existing web APIs.

## User scenarios

### Note taking, captions, and translation

A note-taking application could record audio from a
[meeting or lecture](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12#issuecomment-1960941133)
playing in another browser tab or application, without also capturing video.
The same audio could be transcribed to create captions, translations, or
searchable notes.
A standalone note-taking application could also combine audio from a selected
meeting source with the user's microphone for
[AI transcription](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12#issuecomment-4449563056).

### Live production and audio sharing

A
[production application](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12#issuecomment-1960941143)
could mix audio from guests, music players, games, soundboards, and other
applications for a livestream or recording. It could also share an
application's audio during a call without sharing its window.

Native tools already support these workflows.
[OBS Studio](https://obsproject.com/kb/application-audio-capture-guide)
captures individual applications as separate audio sources, while
[Voicemeeter](https://vb-audio.com/Voicemeeter/) mixes and routes audio from
multiple sources.
[Rocket Broadcaster](https://www.rocketbroadcaster.com/) captures and sends
live audio to a streaming service. These tools show an established need for
capturing and combining audio without requiring video.

### Audio analysis and processing

A website could use playback audio to create visualizations or apply audio
effects chosen by the user.

The W3C discussion includes a
[developer building an audio visualizer](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12#issuecomment-1960941124)
who found that screen capture hurt performance.

### Real-time communication

In a call, audio played by the device—such as far-end participants, shared
media, or notifications—can leak into the microphone. Other participants may
hear this as echo, and the extra audio can interfere with the application's
voice processing.

The same problem affects people who use a screen reader or Narrator. Assistive
audio played by the device can be picked up by the microphone and sent to
other participants as if it came from the user.

Call-center or webphone software could
[record call audio](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12#issuecomment-1960941133)
together with the operator's microphone without capturing video or integrating
with the calling application.

With a separate playback track, the communication application can compare what
the device played with what the microphone captured, apply its own echo
cancellation and voice processing, and send only the processed microphone
track to other participants. Camera capture remains separate and continues to
use `getUserMedia()`.

### AI voice chat

An AI voice-chat application could use playback audio to avoid treating its
own spoken response or Narrator as a new user request and to detect when the
user interrupts. A related
[W3C comment](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12#issuecomment-4668855578)
argues that AI agents should not require video access when they need only
audio.

## Goals

- Enable users to share audio from a supported tab, application, or device
  without sharing screen.
- Use browser UI to let users authorize playback capture, select a source when
  needed, see when capture is active, and stop sharing.
- Return a standard audio `MediaStreamTrack` that websites can record, process,
  or share using existing web APIs.
- Support applications that process playback and microphone audio together.

## Non-goals

- Allowing playback audio to be captured without the user's permission.
- Guaranteeing support for tab, application, and device audio on every
  platform.
- Bypassing restrictions that prevent protected music or video from being
  captured.

## Proposed Approach

Both options let a website request playback audio without receiving a video
track. Option 1 extends the existing display-capture entry point. Option 2
adds a dedicated playback-capture method.

### Shared requirements

Regardless of the API entry point:

- A recent user action is required before the request opens a picker.
- The browser presents browser-controlled source-selection or permission UI.
- The user can identify, understand, and approve the audio source or source
  scope.
- The website cannot enumerate or silently select applications.
- The returned `MediaStream` contains only audio.
- Browser-controlled UI indicates active capture and lets the user stop it.
- Microphone and camera capture continue to use `getUserMedia()` and are
  requested separately from playback capture.

### Option 1: Allow audio-only `getDisplayMedia()`

Allow `getDisplayMedia()` to return a stream containing audio without video:

```js
const playbackStream =
    await navigator.mediaDevices.getDisplayMedia({
      video: false,
      audio: true,
    });

const playbackTrack = playbackStream.getAudioTracks()[0];
```

The browser would open a browser-controlled picker for the audio sources it
can expose, such as a browser tab, application, or system audio where
available. The user—not the website—would make the final source choice, and
the returned stream would contain only the selected audio.

This option reuses the existing `getDisplayMedia()` user activation, source
picker, non-persistent permission, and ongoing sharing-control model. It
changes the current model in which video is required and audio is optional.

### Option 2: Add `getPlaybackMedia()`

Add a method for requesting playback audio:

```js
const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia({
      audio: true,
    });

const playbackTrack = playbackStream.getAudioTracks()[0];
```

This option clearly separates playback capture from microphone, camera, and
screen capture and avoids changing existing `getDisplayMedia()` behavior.

The `audio` member provides a place for applicable audio constraints and
playback-specific options. The exact option shape remains open.

### Use with a microphone

A note-taking, communication, or AI voice-chat application first gets the
microphone:

```js
const microphoneStream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

const microphoneTrack = microphoneStream.getAudioTracks()[0];
```

A note-taking application could then let the user select the meeting or
lecture audio through either proposed API.

With audio-only `getDisplayMedia()`:

```js
const playbackStream =
    await navigator.mediaDevices.getDisplayMedia({
      video: false,
      audio: true,
    });
```

With `getPlaybackMedia()`:

```js
const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia({
      audio: true,
    });
```

A communication or AI voice-chat application that specifically needs combined
device playback for echo cancellation or voice processing could illustrate a
playback-specific option as:

```js
const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia({
      audio: {
        source: "system",
      },
    });
```

The `source` member is illustrative. An equivalent option shape for audio-only
`getDisplayMedia()` remains open.

The microphone and playback requests are independent. If the user declines
playback capture, the application can continue using the microphone.

Applications that process microphone and playback audio together need timing
information that can be compared reliably. The exact clock, timestamp, drift,
and latency requirements remain open.

### Comparison

| Option | Benefit | Tradeoff |
| --- | --- | --- |
| Audio-only `getDisplayMedia()` | Reuses an existing API, picker, sharing controls, and applicable audio options | Changes an API where video has historically been required, and several display-oriented options need further design |
| New `getPlaybackMedia()` | Clearly describes playback capture and avoids changing existing API behavior | Adds another media-capture method and requires explicit policy, indicator, and option-integration decisions |

### Source selection

Both options could support more than one source-selection model:

| Model | Browser behavior |
| --- | --- |
| User-selected source | The browser opens a picker where the user chooses a supported browser tab, application, or system-audio source. |
| Direct system-audio request | The website states that it needs combined device playback, and the browser clearly explains the broader scope and lets the user allow or deny the request. |
| Source preference | The website indicates that system audio is preferred, but the browser controls which choices are offered and the user makes the final selection. |

A direct system-audio request is important for scenarios such as custom echo
cancellation and voice processing that require a reference for combined device
playback. It must not allow silent capture: the request still requires a user
action, explicit browser UI, ongoing indication, and a stop control.

The `audio.source` member shown above is illustrative. Whether `"system"` is a
direct request, a non-binding preference, or a choice the user must make in
the browser picker remains open. An equivalent shape for audio-only
`getDisplayMedia()` also remains open. The existing `systemAudio` member
currently expresses only a preference about whether system audio is offered
with monitor capture.

### Use with existing APIs

The website can use the returned track with existing APIs.

Record it:

```js
const recorder = new MediaRecorder(playbackStream);
recorder.start();
```

Process or analyze it:

```js
const context = new AudioContext();
const source = context.createMediaStreamSource(playbackStream);
```

Share it through an existing WebRTC connection:

```js
peerConnection.addTrack(playbackTrack, playbackStream);
```

## Privacy and security

Playback audio may include sensitive content from tabs, applications, or the
device.

See the illustrative
[permission and source-selection flow mockups](permission-ux-flow-mockups.md)
and
[ongoing capture indicator and control mockups](https://microsoftedge.github.io/MSEdgeExplainers/PlaybackAudioCapture/ongoing-use-mockups/).

- Access requires a user action and browser-controlled permission.
- The browser controls source selection; the website cannot enumerate or
  silently choose applications.
- The browser clearly indicates when playback audio is being captured and lets
  the user stop it.
- Browsers may exclude protected content or sources the platform cannot
  capture.

Playback capture ends when the user stops it, permission is revoked, the source
becomes unavailable, or the website stops the track.

## Open questions

### Questions affecting the API choice

- Is changing `getDisplayMedia({video: false})` from rejection to success
  compatible with existing websites, and how should developers detect support?
- Should audio-only capture reuse the `display-capture` Permissions Policy or
  define a narrower playback-audio policy?
- Can the existing display-capture privacy indicator accurately describe
  audio-only capture, or is distinct playback-audio indication needed?
- Which existing
  [`getDisplayMedia()` options](https://w3c.github.io/mediacapture-screen-share/#displaymediastreamoptions)
  should be reused, changed, or omitted?

### Follow-up design questions

- Should a website be able to request system audio directly, provide only a
  non-binding preference, or leave all source choice to the user?
- How should either model align with the existing `systemAudio` and
  `windowAudio` preferences?
- How should the browser help the user verify an audio source before sharing
  it? Display capture can show a visual preview of the selected surface, but
  audio has no direct equivalent. Should the picker use clear source names and
  icons, audio-activity indicators, scope explanations, or another
  confirmation mechanism?
- Which audio constraints and capabilities should playback tracks support, and
  how should the
  [constrainable pattern](https://w3c.github.io/mediacapture-main/#constrainable-interface),
  including `getCapabilities()`, `getSettings()`, `getConstraints()`, and
  `applyConstraints()`, apply to them?
- What timing guarantees are needed when microphone and playback audio are
  processed together?
- What sources and processing stages should be included in
  [system audio](https://w3c.github.io/mediacapture-screen-share/#dom-displaymediastreamoptions-systemaudio)
  on each platform?

### Permission and privacy

- How should self-capture work for playback audio? Should the requesting tab
  appear in the source picker, should system capture include audio produced by
  the requesting site, and should the proposal align with existing mechanisms
  such as
  [`selfBrowserSurface`](https://w3c.github.io/mediacapture-screen-share/#dom-displaymediastreamoptions-selfbrowsersurface),
  [`restrictOwnAudio`](https://w3c.github.io/mediacapture-screen-share/#def-constraint-restrictOwnAudio),
  or
  [`suppressLocalAudioPlayback`](https://w3c.github.io/mediacapture-screen-share/#def-constraint-suppressLocalAudioPlayback)?
- Should playback-audio permission persist like
  [`getUserMedia()`](https://w3c.github.io/mediacapture-main/#dom-mediadevices-getusermedia)
  or require a new user decision for every request like
  [`getDisplayMedia()`](https://w3c.github.io/mediacapture-screen-share/#dom-mediadevices-getdisplaymedia)?
  Should permission behavior differ between system audio and a user-selected
  source?

## Alternatives considered

### Extend `getUserMedia()`

The platform could add a playback-audio member to `getUserMedia()`:

```js
const stream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
      playbackAudio: true,
    });
```

This could request microphone and playback audio together. However,
playback-source selection requires a browser picker and a recent user action,
which does not fit naturally with the existing microphone and camera
permission model. It would also require a way to distinguish microphone and
playback tracks returned in the same stream.

### Use `systemAudio` or `audioSelection` with `getDisplayMedia()`

`systemAudio: "include"` asks the browser to offer system audio during display
capture. `audioSelection`, previously discussed as
[`audioPreference`](https://www.w3.org/2026/07/14-webrtc-minutes.html),
is a non-binding hint that audio is important in a `getDisplayMedia()` request:

```js
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true,
  systemAudio: "include",
  audioSelection: "preferred",
});
```

These options can improve requests that need both video and audio, but neither
provides audio-only capture.

### Stop the video track after requesting display capture

A website can request display capture and immediately stop the video track.
The user must still approve screen sharing, the website may initially receive
video, and an audio track is not guaranteed.

### Improve browser echo cancellation

Better browser echo cancellation would improve calls and should be explored
separately. It would not support audio-only recording, note taking,
broadcasting, visualization, translation, processing, or sharing scenarios in
the browser.

## Stakeholder Feedback / Opposition

This proposal is being shared to gather feedback from browser vendors, web
developers, and standards participants.

Developer interest and use cases are documented in
[the existing W3C discussion](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12).
No browser vendor has yet expressed a formal standards position on any API
option.

During the
[September 15, 2026 WebRTC Working Group discussion](https://www.w3.org/2026/09/15-webrtc-minutes.html#Capturing_playback_audio-only),
participants expressed interest in exploring the capability and did not
identify a fundamental blocker. WebRTC Working Group chairs discussed the API
options: Jan-Ivar Bruaroey preferred extending `getDisplayMedia()`, Youenn
Fablet preferred a new method that reuses display-capture infrastructure, and
Guido Urdaneta leaned toward a new method but remained open to either
direction. All three emphasized source-picker clarity and informed user
choice, including the challenge of helping users verify an audio source
without the visual preview available during display capture.

## References & Acknowledgements

- [Media Capture and Streams](https://w3c.github.io/mediacapture-main/)
- [Screen Capture](https://w3c.github.io/mediacapture-screen-share/)
- [Media Capture Screen Share Extensions issue #12](https://github.com/w3c/mediacapture-screen-share-extensions/issues/12)

This proposal builds on an
[earlier exploration of playback-reference audio](https://github.com/MicrosoftEdge/MSEdgeExplainers/pull/1377)
by [Huseyin Ozcan](https://github.com/huozcan-ms),
[Max Solodovnikov](https://github.com/solmaks), Hong Sodoma, and Vinod Prakash.

Thanks to [Erik Anderson](https://github.com/erik-anderson) for reviewing and
providing feedback on this explainer.
