# Permission UX Flow Mockups

These flows illustrate how playback-audio access could work. The exact
permission and selection UI is controlled by the browser.

```text
[Website UI]  Explains why the feature needs audio and starts the request.
[Browser UI]  Authorizes access, selects a source, and controls ongoing use.
```

## Option 1: `getPlaybackMedia()`

### Microphone and system audio

```js
const microphoneStream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia({
      audio: {
        source: "system",
      },
    });
```

```text
+---------------------------------------------------+
| WEBSITE UI                                        |
|                                                   |
| Start voice chat                                  |
|                                                   |
|                              [Start]              |
+--------------------------+------------------------+
                           |
                           v
                 Website calls getUserMedia()
                           |
                           v
+---------------------------------------------------+
| BROWSER UI                                        |
|                                                   |
| example.com wants to use available microphones    |
|                                                   |
| [Default microphone                            v] |
|                                                   |
| [ Allow while visiting the site ]                 |
| [ Allow this time                ]                 |
| [ Never allow                    ]                 |
+--------------------------+------------------------+
                           |
                           v
                  Microphone track returned
                           |
                           v
+---------------------------------------------------+
| WEBSITE UI                                        |
|                                                   |
| Improve voice quality                             |
|                                                   |
| Use audio playing on this device to reduce echo   |
| and improve voice quality.                        |
|                                                   |
|                                    [Enable]       |
+--------------------------+------------------------+
                           |
                           v
              Website calls getPlaybackMedia()
                           |
                           v
+---------------------------------------------------+
| BROWSER UI                                        |
|                                                   |
| example.com wants to access audio playing on      |
| this device. This may include audio from other    |
| applications and websites.                        |
|                                                   |
| [ Allow while visiting the site ]                 |
| [ Allow this time                ]                 |
| [ Never allow                    ]                 |
+--------------------------+------------------------+
                           |
                           v
              System playback audio track
                           |
                           v
       Microphone + playback reference processing
                           |
                           v
                Cleaned microphone output
```

The microphone and playback requests have separate permission decisions. If
the user declines playback access, the application can continue using the
microphone. No picker is needed because the playback request already identifies
system audio.

### User-selected audio

```js
const playbackStream =
    await navigator.mediaDevices.getPlaybackMedia({
      audio: {
        source: "user-selected",
      },
    });
```

```text
+---------------------------------------------------+
| WEBSITE UI                                        |
|                                                   |
| Transcribe meeting audio                          |
|                                                   |
| Choose the tab or application where your meeting  |
| or lecture is playing. Only audio will be shared. |
|                                                   |
|                         [Choose audio source]      |
+--------------------------+------------------------+
                           |
                           v
              Website calls getPlaybackMedia()
                           |
                           v
+---------------------------------------------------+
| BROWSER UI                                        |
|                                                   |
| Choose audio to share with notes.example          |
|                                                   |
| Tabs                                              |
|  ( ) Google Meet                                  |
|  ( ) Lecture livestream                           |
|                                                   |
| Applications                                      |
|  ( ) Microsoft Teams                              |
|  ( ) Media Player                                 |
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

The website explains the request but cannot see the available sources or grant
access. The browser owns the picker and returns a track only after the user
selects a source.

## Option 2: extend `getUserMedia()`

When a website requests only playback audio, the UX can follow the same system
or user-selected flow shown for `getPlaybackMedia()`.

### Microphone and system audio

```js
const stream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
      playbackAudio: {
        source: "system",
      },
    });
```

Both microphone and playback audio are required by this combined request. The
browser could use one combined panel:

```text
+---------------------------------------------------+
| WEBSITE UI                                        |
|                                                   |
| Use your microphone for the call and audio playing |
| on this device to improve voice quality.          |
|                                                   |
|                              [Continue]            |
+--------------------------+------------------------+
                           |
                           v
                 Website calls getUserMedia()
                           |
                           v
+---------------------------------------------------+
| BROWSER UI                                        |
|                                                   |
| example.com wants to:                             |
|                                                   |
|  Use available microphones (1)                    |
|  Access audio playing on this device              |
|                                                   |
|  Microphone                                       |
|  [Default microphone                           v] |
|                                                   |
|  This may include audio from other applications   |
|  and websites.                                    |
|                                                   |
|  [ Allow while visiting the site ]                |
|  [ Allow this time                ]                |
|  [ Never allow                    ]                |
+--------------------------+------------------------+
                           |
              +------------+------------+
        Never allow                  Allowed
              |                         |
              v                         v
       Request denied            Microphone track
                                 + playback track
```

Because this is one combined request, both microphone and playback permission
must be granted for the request to succeed.

### Microphone and user-selected audio

```js
const stream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
      playbackAudio: {
        source: "user-selected",
      },
    });
```

```text
+---------------------------------------------------+
| WEBSITE UI                                        |
|                                                   |
| Create notes from your microphone and meeting     |
| audio. You will choose the meeting source next.   |
|                                                   |
|                              [Continue]            |
+--------------------------+------------------------+
                           |
                           v
                 Website calls getUserMedia()
                           |
                           v
+---------------------------------------------------+
| BROWSER UI                                        |
|                                                   |
| example.com wants to use available microphones    |
|                                                   |
| [Default microphone                            v] |
|                                                   |
| [ Allow while visiting the site ]                 |
| [ Allow this time                ]                 |
| [ Never allow                    ]                 |
+--------------------------+------------------------+
                           |
                           v
+---------------------------------------------------+
| BROWSER UI                                        |
|                                                   |
| Choose a tab or application whose audio to share  |
|                                                   |
| [Browser tabs]  [Applications]                    |
|                                                   |
| ( ) Team meeting - Video call                     |
| (o) Product demo - example.org                    |
| ( ) Presentation - Slides                         |
|                                                   |
|                               [Cancel]  [Share]    |
+--------------------------+------------------------+
                           |
              +------------+------------+
              |                         |
        Picker cancelled          Source selected
              |                         |
              v                         v
       Request rejected           Microphone track
                                 + playback track
```

Because microphone and playback audio were requested together, cancelling the
picker rejects the combined request.

### Independent microphone and playback requests

A note-taking website may need only the selected meeting audio. If it also
wants microphone audio, it can request the two tracks independently so that
declining microphone access does not block transcription.

```text
+---------------------------------------------------+
| WEBSITE UI                                        |
|                                                   |
| Create notes from your meeting audio.             |
| You can also include your microphone.             |
|                                                   |
|                              [Continue]            |
+--------------------------+------------------------+
                           |
                           v
         Website calls getUserMedia() for microphone
                           |
                           v
+---------------------------------------------------+
| BROWSER UI                                        |
|                                                   |
| notes.example wants to use available microphones  |
|                                                   |
| [Default microphone                            v] |
|                                                   |
| [ Allow while visiting the site ]                 |
| [ Allow this time                ]                 |
| [ Never allow                    ]                 |
+--------------------------+------------------------+
                           |
              +------------+------------+
              |                         |
      Permission denied       Permission granted
              |                         |
              v                         v
      Continue without          Microphone track
        microphone                 available
              |                         |
              +------------+------------+
                           |
                           v
     Website calls getUserMedia() for user-selected
                    playback audio
                           |
                           v
+---------------------------------------------------+
| BROWSER UI                                        |
|                                                   |
| Choose the tab or application where your meeting  |
| is playing. Only audio will be shared.            |
|                                                   |
|                         [Cancel]  [Share audio]    |
+--------------------------+------------------------+
                           |
              +------------+------------+
              |                         |
            Cancel                 Share audio
              |                         |
              v                         v
       No meeting audio          Playback track
       is available              available
                                        |
                                        v
                              Website transcribes
                              playback audio and
                            includes the microphone
                                if it was allowed
```

Each request keeps the existing all-or-nothing behavior, but one request
failing does not affect the other.

## Ongoing controls

See the
[ongoing capture UX mockups](https://nishitha-burman.github.io/playback-audio-ongoing-use-mockups/)
for illustrative ideas showing how users could monitor and stop active capture.

All successful flows end with browser-controlled ongoing-use UI:

```text
Capture begins
      |
      v
Browser indicates that playback audio is being captured
      |
      v
User can stop capture
```

Playback capture ends when the user stops it, permission is revoked, the source
becomes unavailable, or the website stops the track.
