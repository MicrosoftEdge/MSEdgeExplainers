# Set Default Audio Output Device

Author: [Sunggook Chue] [Ravikiran Ramachandra] [Steve Becker] [Andy Luhrs]

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

This document status: Active
Expected venue: [WebRTC WG](https://www.w3.org/groups/wg/webrtc)
Current version: this document

## Introduction

Setting Audio Output Device In Frames

In embedded web experiences, the top-level frame grants iframes access to system media devices like microphones, cameras and speakers. This is typically done through the permission policy (https://developer.mozilla.org/en-US/docs/Web/HTTP/Permissions_Policy) in the iframe tag. However, this access comes with two key challenges:

- Independent Choice: Each iframe independently chooses its own media device. The top-level frame cannot directly influence or view this selection due to browser security restrictions (cross-origin boundary).
- Unsynchronized Changes: When the top-level frame changes its media device, the iframes remain unaware unless they communicate using methods like postMessage. This lack of automatic synchronization can lead to inconsistencies and a disjointed user experience.

We’d like to propose a new API to set the default audio output device for the current top frame and of its sub frames.

## Goals

- Developers can modify the default audio output for the top-level frame page.
- Developers can modify the default audio output for the sub frame pages.
- Developers can modify the default audio output for the top-level frame and all other sub frames from the same-origin sub frame.
- Any media element or audio context can continue to override this default setting using the existing setSinkId API.

## Non Goals
- A change notification for default audio output is not in scope of this project.
- Any permission policy requirement for calling the API is not in scope of this project.

## Use Cases

### 1st case
Communication app customers may use external headsets for calls, separate from their computer’s default audio option. For instance, they might have their default setup to play music through speakers, but would always want to have (potentially private) calls through a Bluetooth headset. Today, many communication apps have a setting for customers to pick their preferred output device.

Communication apps may also include a variety of other applications embedded inside of it. These embedded applications may play audio during a meeting in addition to the normal audio of the call. For example, like when a video is embedded in a slide show presentation application.

### 2nd case
A User:
A user actively engages in online meetings using a browser communication app. During these meetings, the presenter embeds live PowerPoint presentations within iframes. These embedded presentations often include crucial content from video share site.
However, a user faces a delightful dilemma: her children are playing in the backyard, and she wants to play music for them using a Bluetooth speaker. To achieve this, she cleverly configures her system settings:

- Bluetooth Speaker: A user sets the system default audio output to the Bluetooth speaker, ensuring her children enjoy their music outdoors.

- Computer Speaker: Simultaneously, she selects the computer speaker as the communication app’s default audio output through communication app's speaker selection UI. This way, she can listen to both the video share site content within the live PowerPoint page and the presenter’s voice during her online meetings.

A user’s multitasking prowess ensures a harmonious blend of work, family, and entertainment!

A developer:
A developer: Developers of communication app can provide audio output selection UI on their top level page that enable the user to select which audio output device to use in both the top level app and all sub frames.

## Proposed Solution

New method `setDefaultSinkId(deviceId)` on the [MediaDevices API](https://www.w3.org/TR/mediacapture-streams/#mediadevices),
where `deviceId` is the [media device identifier](https://www.w3.org/TR/mediacapture-streams/#dom-mediadeviceinfo-deviceid)

```js
[Exposed=Window, SecureContext]
interface MediaDevices : EventTarget {
  ...
  Promise<void> setDefaultSinkId(DOMString deviceId);
};

deviceId:
   This attribute contains the ID of the audio device through which output is being delivered, or the empty string if output is delivered
   through the user-agent default device. If nonempty, this ID should be equal to the deviceId attribute of one of the MediaDeviceInfo values
   returned from enumerateDevices().

Return:
   A Promise that fulfills with a value of undefined.

Exceptions:
  NotAllowedError DOMException
    Returned if a cross-origin sub frame tries to call the API.

  NotFoundError DOMException
    Returned if the deviceId does not match any audio output device.

  AbortError DOMException
    Returned if switching the audio output device to the new audio device failed.
```

This API is accessible from the top-level frame and the same-origin sub frames and allows modification of the default audio output for both
the top-level frame and all sub frames, regardless of their origins. However, it’s important to note that this change does not affect custom
audio outputs specified using the setSinkId method in media element or audio context.

Remember to call this API within a secure context (using HTTPS).

### Example

```js
<!-- index.html -->
<body>
  <button id="audioDeviceSelection">
  <iframe src="presentationLive.html"></iframe>
  ...
  <script>
    const audioContext = new AudioContext();
    ...
    let selectedDeviceId = "";

    // App shows audio output devices for a user to select.
    audioDeviceSelection.addEventListner('click', (list) => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((device) => device.kind === 'audiooutput');

      // showDialogForDeviceSelection is a dialog that allow user to select
      // audio device, it could be 'selectAudioOutput' API
      // (https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/selectAudioOutput)
      // if the user agent supports it.
      selected_device = await showDialogForDeviceSelection(audioOutputs);
      selectedDeviceId = selected_device.deviceId;
    });

    ...

    // setDefaultSinkId will change the audio output device for the entire frame that includes subframes.

    // If selectedDeviceId is empty string, "", then setDefaultsinkId will revert to using the system default device.
    await navigator.mediaDevices.setDefaultSinkId(selectedDeviceId);

    // It does not have to call audioContext.setSinkId in order to change audioContext's audio device output.
  </script>
</body>


<!-- presentationLive.html -->
<body>
  ...
  <iframe src="mediaPlay.html"></iframe>
</body>

<!-- mediaPlay.html -->
<body>
  ...
  <video id="videoElem" src="https://www.mediaPlayLive.com/123abc"></video>
  <script>
    const videoElem = document.getElementById('videoElem');

    // videoElem.sinkId === selectedDeviceId after calling setDefaultSinkId.
  </script>
</body>
```

## Privacy and Security Considerations

### Privacy
No considerable privacy concerns are expected, but we welcome community feedback.

### Security
No considerable security concerns are expected, but we welcome community feedback.

Discussion: https://github.com/w3c/mediacapture-output/issues/63

## Alternative Solutions
An alternative solution involves introducing a similar API to setSinkId specifically for the HTMLIFrameElement. This enhancement would allow the parent frame to modify the default audio output for its sub frames. Let’s call this new API HTMLIFrameElement::setDefaultSinkId(deviceId) or HTMLIFrameElement::setDefaultSinkId(AudioSinkOptions).

```js

[Exposed=Window]
interface HTMLIFrameElement : EventTarget {
  ...
  Promise<void> setDefaultSinkId(DOMString deviceId);
};

deviceId:
   This attribute contains the ID of the audio device through which output is being delivered, or the empty string if output is delivered
   through the user-agent default device. If nonempty, this ID should be equal to the deviceId attribute of one of the MediaDeviceInfo values
   returned from enumerateDevices().

```

Here are the key points of this approach:
* Functionality: The setDefaultSinkId API can be invoked from any frame, enabling changes across all child frames within the sub frame hierarchy. However, it does not alter the audio output of the frame from which it is called. Therefore, developers must still manage their own frame’s audio output using setSinkId for relevant media elements and audio contexts.
* Potential Benefit: By utilizing {type: 'none'} as a parameter for setDefaultSinkId, we could easily support a ‘muted’ feature for iframes. This would enhance flexibility in muting audio within the iframe context. ( {type : ‘none} scheme is already supported from AudioContext::setSinkId)
* Drawback: The frame itself must explicitly call setSinkId for any specific audio outputs it requires in the current frame.

In summary, the pros of this alternative include muting capabilities while maintaining the responsibility for individual frame audio settings.

## Open Questions
* Do we have to provide permission policy (e.g. speaker-selection) for the top-level frame to allow cross-origin sub frame to be able to call the API?
