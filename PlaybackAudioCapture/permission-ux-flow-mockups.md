# Audio-only access UX flows

These examples illustrate possible user experiences for either proposed API.
The exact UI is controlled by the browser.

## Option 1: audio-only `getDisplayMedia()`

```js
const playbackStream =
    await navigator.mediaDevices.getDisplayMedia({
      video: false,
      audio: true,
    });
```

This option adapts the existing display-capture entry point and picker to
return only audio.

## Option 2: `getPlaybackMedia()`

```js
const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia();
```

This option introduces a dedicated playback-capture entry point while reusing
the same browser-controlled picker model.

## User-selected source flow

```text
+---------------------------------------------------+
| WEBSITE UI                                        |
|                                                   |
| Choose audio for meeting notes                    |
|                                                   |
| Select the tab or application where the meeting   |
| is playing. Only audio will be shared.             |
|                                                   |
|                         [Choose audio source]      |
+--------------------------+------------------------+
                           |
                           v
        Website calls the selected capture API
                           |
                           v
+---------------------------------------------------+
| BROWSER UI                                        |
|                                                   |
| Choose audio to share with notes.example          |
|                                                   |
| Browser tabs                                      |
|  ( ) Meeting app                                  |
|  ( ) Lecture livestream                           |
|                                                   |
| Applications                                      |
|  ( ) Microsoft Teams                              |
|  ( ) Media Player                                 |
|                                                   |
| Device audio                                      |
|  ( ) All audio playing on this device             |
|                                                   |
|                         [Cancel]  [Share audio]    |
+--------------------------+------------------------+
                           |
                           v
              Selected playback audio track
                           |
                           v
          Browser shows an ongoing indicator
```

The website cannot see the available sources or silently select an
application. The browser owns the picker, and the user makes the final choice.

## Direct system-audio flow

Some applications specifically need combined device playback rather than a
single tab or application.

1. The website explains why system audio is required.
2. The user clicks a control such as **Enable enhanced processing**.
3. The browser explains that capture may include audio from multiple tabs,
   applications, notifications, and accessibility tools.
4. The user allows or denies the request.
5. If allowed, the browser returns an audio-only system-audio track and shows
   ongoing capture UI.

Illustrative browser UI:

```text
+---------------------------------------------------+
| example.com wants to capture all audio playing   |
| on this device. This may include audio from      |
| multiple applications, websites, notifications, |
| and accessibility tools.                        |
|                                                  |
|                         [Don't allow]  [Allow]   |
+---------------------------------------------------+
```

This flow remains an open design option. The browser must not allow silent
system-audio capture.

The picker concept is illustrative. The key requirements are:

- Clearly state that only audio will be shared.
- Help the user recognize which audio source they are selecting.
- Represent applications that may own several windows.
- Explain that system audio may include multiple applications,
  notifications, and audio that starts playing later.
- Make narrower sources easy to choose when they satisfy the request.

## Use with a microphone

An application that needs microphone and playback audio can request them
separately:

```js
const microphoneStream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia({
      source: "system",
    });
```

The playback call above could instead use audio-only `getDisplayMedia()`. A
single website control, such as **Start voice**, can begin the coordinated
flow, but the browser still owns each permission and source-selection
decision.

If playback capture is declined, the application can continue using the
microphone. Communication and AI voice applications could use the playback
track locally as a reference for echo cancellation and voice processing.

The `source` member is illustrative. Whether it represents a direct request,
a preference, or a choice the user must make in the picker remains open.

## Ongoing controls

All successful flows end with browser-controlled ongoing-use UI:

```text
Capture begins
      |
      v
Browser indicates which site is capturing playback audio
      |
      v
User can inspect the source and stop capture
```

See the
[ongoing capture UX mockups](https://microsoftedge.github.io/MSEdgeExplainers/PlaybackAudioCapture/ongoing-use-mockups/)
for additional illustrative ideas.

Playback capture ends when the user stops it, permission is revoked, the
source becomes unavailable, or the website stops the track.
