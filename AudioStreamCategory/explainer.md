# Audio Stream Category
Authors: [Sam Dallstream](https://github.com/sjdallst), [Greg Whitworth](https://github.com/gregwhitworth), [Rahul Singh](https://github.com/rahulsingh-msft)

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C mst-content-hint](https://w3c.github.io/mst-content-hint/) 
* Current version: this document

## Introduction

The Audio Category is a proposed addition to the [mst-content-hint spec](https://github.com/w3c/mst-content-hint) that will allow websites to set a ```contentHint``` on a ```MediaStreamTrack``` that specifies that the track is meant for speech recognition by a machine.

The ```contentHint``` we are proposing is ```uniformSpeech```.

## Background

We believe there is a general need to differentiate between streams intended for human consumption and streams meant to be used for transcription by a machine because there are many differences in the optimizations that are applied for each scenario. Specifically, requirements for communications between humans can be found in the [ETSI TS 126 131 specification](https://www.etsi.org/deliver/etsi_ts/126100_126199/126131/12.03.00_60/ts_126131v120300p.pdf), and include optimizations in noise suppression like the addition of pink noise in order to increase user satisfaction, which is in direct opposition to the needs of a speech recognition system. There is also a draft of testing methods for speech recognition systems that outlines some of the different requirements for those systems [STQ63-260v0210](https://drive.google.com/file/d/1y_i7NkXbCuRWznYRl9dacy3xDdH2e7-m/view?usp=sharing).

The proposed solution below was inspired by the categories that Windows offers for audio streams. These categories allow you to specify what kind of audio stream you want (ex: “speech” for when someone is dictating into a mic), which gives the operating system a chance to optimize the stream for that type of input. After some research, we found that similar categories exist across [Android](https://developer.android.com/reference/android/media/AudioAttributes.html), [iOS](https://developer.apple.com/documentation/avfoundation/avaudiosessionmode?language=objc), and, of course, [Windows](https://docs.microsoft.com/en-us/windows-hardware/drivers/audio/audio-signal-processing-modes).

## Proposed Solution

We plan to follow the lead of native applications across Android, iOS, and Windows, and extend the list of content-hints for the developer to choose from when working with a stream. We will adapt this to the web by modifying the [mst-content-hint API](https://w3c.github.io/mst-content-hint/). For operating systems, such as Mac, that do not have one to one mappings of these categories, a best effort approach will be taken to applying categories.

## Proposed API

Add the ```uniformSpeech``` option to ```contentHint``` for audio tracks.

### IDL

[Extension to MediaStreamTrack](https://w3c.github.io/mst-content-hint/#mediastreamtrack-extension)
```
partial interface MediaStreamTrack {
  attribute DOMString contentHint;
};
```

## Examples

### Example 1: Get an audio stream and set the category set to “speech”
```
const constraints = {volume: 1}; 
navigator.mediaDevices.getUserMedia({ audio : constraints})
      .then(handleMediaStreamAcquired.bind(this),
          handleMediaStreamAcquiredError.bind(this));

function handleMediaStreamAcquired(mediaStream) {
  mediaStream.getTracks()[0].contentHint = 'uniformSpeech';
}

function handleMediaStreamAcquiredError(mediaStreamError) {
  console.log(mediaStreamError);
}
```
