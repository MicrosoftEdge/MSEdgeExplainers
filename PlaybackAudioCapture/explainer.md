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
by a browser tab, application, or the device—without sharing screen pixels. A
website can request system audio or ask the browser to let the user select a
source. The browser controls permission and source selection, and the website
receives a standard audio track that it can record, process, or share.

This document considers two API options:

1. Add a new `getPlaybackMedia()` method.
2. Extend `getUserMedia()` with a playback-audio option.

Both options return an audio track that works with existing web APIs.

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

Both options let a website request system audio or a source selected by the
user without requiring video. Option 1 returns a playback-only `MediaStream`.
Option 2 adds a playback track alongside any other requested tracks.

### Option 1: Add `getPlaybackMedia()`

Add a method for requesting playback audio:

```js
const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia({
      audio: {
        source: "user-selected",
      },
    });

const playbackTrack = playbackStream.getAudioTracks()[0];
```

A note-taking app could use this to let the user select the tab where a
meeting or lecture is playing.

This option clearly separates playback capture from microphone, camera, and
screen capture.

Microphone and camera capture continue to use `getUserMedia()`, including its
existing device and track constraints.

#### Use with a microphone

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
lecture audio:

```js
const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia({
      audio: {
        source: "user-selected",
      },
    });
```

A communication or AI voice-chat application could instead request system
audio:

```js
const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia({
      audio: {
        source: "system",
      },
    });
```

The two requests are independent. If the user declines playback capture, the
application can continue using the microphone.

### Option 2: Extend `getUserMedia()`

Add a `playbackAudio` option to `getUserMedia()`.

A note-taking website that only needs playback audio could let the user choose
the tab or application where a meeting or lecture is playing:

```js
const playbackStream =
    await navigator.mediaDevices.getUserMedia({
      playbackAudio: {
        source: "user-selected",
      },
    });
```

A communication or AI voice-chat application could request microphone and
playback audio together:

```js
const stream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
      playbackAudio: {
        source: "system",
      },
    });
```

The existing `audio` and `video` members and their constraints remain
unchanged. A website that also needs a camera can request all three:

```js
const stream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
      playbackAudio: {
        source: "system",
      },
    });
```

As with `getUserMedia()` today, every requested media type is required. If
microphone, camera, or playback access fails, the request is rejected. A
website that can use either microphone or playback audio can request them
separately and handle each result independently. Whether a future version
should support an explicit best-effort playback request remains open.

Both tracks are audio tracks, so the proposal must give developers a way to
tell them apart. One possible design is a `sourceType` value:

```js
const microphoneTrack =
    stream.getAudioTracks().find(track =>
      track.getSettings().sourceType === "microphone");

const playbackTrack =
    stream.getAudioTracks().find(track =>
      track.getSettings().sourceType === "playback");
```

Applications that process microphone and playback audio together need timing
information that can be compared reliably. The exact clock, timestamp, drift,
and latency requirements remain open.

This option reuses an existing capture method, but changes `getUserMedia()`
from an API for microphone and camera input into one that can also capture
audio being played by the device.

### Comparison

| Option | Benefit | Tradeoff |
| --- | --- | --- |
| New `getPlaybackMedia()` | Clearly describes playback capture and works independently | A communication application makes separate microphone and playback requests |
| Extend `getUserMedia()` | Can request microphone and playback audio together | Changes the meaning of `getUserMedia()`, may combine a permission prompt with a source picker, and requires a way to identify the two audio tracks |

### Source selection

Both options can support two source modes:

| Source value | Browser behavior |
| --- | --- |
| `"system"` | The combined audio rendered by the device that the browser and platform can expose |
| `"user-selected"` | Let the user choose a tab or application through browser-controlled UI |

The source names are illustrative and open to discussion. The website does not
receive a list of running applications or choose a tab or application without
the user. The exact sources included in system audio may vary by browser and
operating system.

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
- A user-selected request uses browser UI; the website cannot enumerate or
  silently choose applications.
- The browser clearly indicates when playback audio is being captured and lets
  the user stop it.
- Browsers may exclude protected content or sources the platform cannot
  capture.

Playback capture ends when the user stops it, permission is revoked, the source
becomes unavailable, or the website stops the track.

## Open questions

- What timing guarantees are needed when microphone and playback audio are
  processed together?
- What sources and processing stages are included in system audio on each
  platform?
- How should playback permission integrate with existing browser permission
  controls and capability elements?

## Alternatives considered

### Allow audio-only `getDisplayMedia()`

The platform could allow:

```js
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: false,
  audio: true,
});
```

This reuses an existing method. However, `getDisplayMedia()` is designed around
selecting and sharing visible content. Video is required and audio is optional.
The WebRTC Working Group discussion identified audio-only capture as a large
change to that model. For that reason, this is not one of the proposed
options.

### Use `systemAudio` or `audioPreference` with `getDisplayMedia()`

`systemAudio: "include"` asks the browser to offer system audio during display
capture. The proposed `audioPreference: "high"` value, discussed in the
July 2026 WebRTC Working Group meeting ([minutes](https://www.w3.org/2026/07/14-webrtc-minutes.html),
[slides](https://docs.google.com/presentation/d/1aivu0RWAtlHpJ4dFyTPblPXGMn-ZdK9GG2xuqgcg9MQ/edit?slide=id.g2bb12bc23cb_0_0#slide=id.g2bb12bc23cb_0_0)),
tells the browser that receiving audio is important:

```js
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true,
  systemAudio: "include",
  audioPreference: "high",
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
No browser vendor has yet expressed a formal position on either API option.

Prior discussions have raised questions about platform support, privacy and
security, source scope, permission UX, and whether playback-audio capture
should extend an existing API or use a new API. These remain open areas for
feedback and discussion.

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
