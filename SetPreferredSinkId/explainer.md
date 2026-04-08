# Set Preferred Audio Output Device

Authors: Sunggook Chue, Ravikiran Ramachandra, Steve Becker, Andy Luhrs

## Participate

- https://github.com/w3c/mediacapture-output/issues/141
- https://github.com/w3c/mediacapture-output/issues/63
- https://github.com/w3c/audio-session/issues/6

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: Active
* Expected venue: [WebRTC WG](https://www.w3.org/groups/wg/webrtc)
* Current version: this document

## Introduction

The browser defines a default audio output device used by all audio renderers.  Audio renderers include [HTML media elements](https://html.spec.whatwg.org/multipage/media.html#media-element) and [web audio contexts](https://webaudio.github.io/web-audio-api/#AudioContext).  Each audio renderer can override the default audio output device using [`setSinkId()`](https://w3c.github.io/mediacapture-output/#dom-htmlmediaelement-setsinkid) to select a different audio output device.  This proposal introduces `setPreferredSinkId()`, which enables a top-level frame to override the default audio output device for all audio renderers in the top-level frame and its child frames, including cross-origin child frames.

Without `setPreferredSinkId()`, a top-level frame has no mechanism to change the default audio output device in its cross-origin child frames.  A top-level frame cannot use [`setSinkId()`](https://w3c.github.io/mediacapture-output/#dom-htmlmediaelement-setsinkid) in a cross-origin child frame due to security boundaries.  Instead, the top-level frame and cross-origin child frame must collaborate using postMessage() to change the audio output device.

This limitation leads to an inconsistent, disjointed user experience for composable multimedia apps that include embedded video players and embedded slideshows.  Each cross origin child frame may independently chose the audio output device, potentially causing multiple audio output devices to play at the same time.  Similarly, if the top-level frame changes its audio output device, the cross origin child frame's audio does not change, disrupting the user's expectations for audio playback.

## Goals

- Top-level frames can override the default audio output device for all audio renderers in the top-level frame and its child frames, including cross-origin child frames.

## Non Goals

- Overriding non-default audio output devices.  This proposal does not change the behavior of [`setSinkId()`](https://w3c.github.io/mediacapture-output/#dom-htmlmediaelement-setsinkid).  Each audio renderer may continue to override the default audio output device using [`setSinkId()`](https://w3c.github.io/mediacapture-output/#dom-htmlmediaelement-setsinkid).

- Dispatching an event when the default audio output device changes.  Audio renders cannot detect when the browser or `setPreferredSinkId()` changes the default audio output device.  The [`sinkId`](https://w3c.github.io/mediacapture-output/#dom-htmlmediaelement-sinkid) attribute will continue to return its default value, the empty string, before and after the default audio output device changes.

- Introduce a new permission.  This proposal restricts `setPreferredSinkId()` usage to top-level frames only.  The caller of `setPreferredSinkId()` must retrieve audio output device IDs using the pre-existing APIs [`mediaDevices.enumerateDevices()`](https://w3c.github.io/mediacapture-main/#dom-mediadevices-enumeratedevices) or [`MediaDevices.selectAudioOutput()`](https://www.w3.org/TR/audio-output/#dom-mediadevices-selectaudiooutput) with pre-existing permission models.

## Use Cases

### Implementing audio output settings

An app developer provides an option to change the audio output device through their app's settings.  When the setting changes, the app uses `setPreferredSinkId()` to override the default audio output device, updating all of its existing audio renderers.  `setPreferredSinkId()` will also affect any future audio renderers the app creates by continuing to override the default audio output device.  Without `setPreferredSinkId()`, the app needed to call [`setSinkId()`](https://w3c.github.io/mediacapture-output/#dom-htmlmediaelement-setsinkid) on every existing and new audio renderer to apply the app's audio setting.

### Changing audio output from speakers to a headset

An office worker configures their device to use speakers as the default audio output.  The office worker uses a communications app to join a video call that includes a cross-origin embedded presentation app.  For this scenario, two audio renderers exist: the communication app outputs voice from the video call and the cross-origin embedded presentation app outputs effects from the slideshow.

To stop disrupting colleagues, the office worker uses the communications app's settings to change the audio output device to use a headset instead of speakers.  The communications app uses `setPreferredSinkId()` with the headset's device ID to update both audio renderers: the voice audio from the video call and the effect audio from the slideshow.  Without `setPreferredSinkId()`, the speakers would continue to output the cross-origin slideshow effects.

## Proposed Solution

Extend [MediaDevices](https://w3c.github.io/mediacapture-output/#mediadevices-extensions) by adding `setPreferredSinkId(deviceId)` where `deviceId` is the [media device identifier](https://www.w3.org/TR/mediacapture-streams/#dom-mediadeviceinfo-deviceid).

```js
partial interface MediaDevices {
  Promise<void> setPreferredSinkId(DOMString deviceId);
};
```

After successfully overriding the default audio output device, the promise fulfills with `undefined`.  Success does not change the [`sinkId`](https://w3c.github.io/mediacapture-output/#dom-htmlmediaelement-sinkid) attribute of any audio renderer.  Only top-level frames may successfully call `setPreferredSinkId()`.  After failure, the promise rejects with one of the following errors:

- `NotAllowedError`: Returned when a child frame calls the API.  This includes both same-origin and cross-origin child frames.
- `NotFoundError`: Returned if the `deviceId` does not match any audio output device.
- `AbortError`: Returned if switching the audio output device to the new audio device failed.

To revert back to using the default audio output device, call `setPreferredSinkId('')` with an empty string device ID.  This is just like the pre-existing `setSinkId('')` behavior.

### Example Usage

```js
// Use enumerateDevices() to retrieve all audio output devices.
const mediaDeviceList = await navigator.mediaDevices.enumerateDevices();
const audioOutputDeviceList = media_device_list.filter(media_device => media_device.kind === 'audiooutput');

// Determine the user's preferred audio output device through a UI prompt or app settings.
const preferredAudioOutputDevice = await selectPreferredAudioOutputDevice(audioOutputDeviceList);

// Set the default audio output device on all renderers for this top-level frame and all of its child frames.
await navigator.mediaDevices.setPreferredSinkId(preferredAudioOutputDevice.deviceId);
```

## Alternative Solution
Add `setPreferredSinkId()` to `HTMLIFrameElement`:

```js
partial interface HTMLIFrameElement {
  void setPreferredSinkId((DOMString or AudioSinkOptions) sinkId);
};
```

This enables the parent frame to modify the default audio output for a child frame using a `DOMString` device ID.   By supporting [`AudioSinkOptions`](https://webaudio.github.io/web-audio-api/#AudioSinkOptions), `HTMLIFrameElement::setPreferredSinkId()` also enables the parent frame to mute a child frame using the sink options `{ type: 'none' }`.

However, this alternative does not fully address the use case that overrides the default audio output device for all audio renderers in a top-level frame and its child frames.  For nested frames, each parent frame needs to call `setPreferredSinkId()` on its child frames.  For nested cross-origin frames, changing audio output requires collaboration between frames using `postMessage()`.  The top-level frame must also call `setSinkId()` on each audio renderer to override the browser's default audio output device.