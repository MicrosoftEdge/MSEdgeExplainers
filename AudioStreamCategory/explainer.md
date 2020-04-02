# Audio Stream Category
Authors: [Sam Dallstream](https://github.com/sjdallst), [Greg Whitworth](https://github.com/gregwhitworth), [Rahul Singh](https://github.com/rahulsingh-msft)

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/) 
* Current version: this document

## Introduction

The Audio Category is a proposed addition to the [MediaStream API](https://w3c.github.io/mediacapture-main/#stream-api) that will allow websites to fetch audio streams that fit into certain categories.

The categories we are proposing are:
- default: Return a stream with the usual modification from the platform and user agent. This is the same as not specifying a ```category```.
- raw: Return a stream without any modifications by the platform or user agent, so you are getting the exact stream that the user's device provides.
- communications: Return a stream with optimizations for communication. Examples of communication include calls, meetings, chat rooms, team chat, etc.
- speech: Return a stream with optimizations for speech. Common use cases for speech are recording audio for a presentation, dictating text, and asking a question to an AI assistant (ex: Siri, Google Assistant, Cortana, etc.)

## Background

Currently ```getUserMedia``` allows you to provide constraints to inform the browser that it should or shouldn’t perform various effects. While this is helpful to some extent; this doesn’t go nearly far enough and the way in which you do echo cancellation or noise suppression can vary based on the context of that input. For example, if a user turns off ```noiseSuppression``` and ```echoCancellation```, they will not recieve raw input as there will still be effects, such as noise cancellation, applied by the operating system that are opaque to the developer. Speech is another example. In Windows, speech is a mix of the different available properties, so turning existing properties on and off would never get you the same result. Therefore, we’re proposing that we follow what native applications have found to be a solid solution by introducing a ```category``` constraint.

The proposed solution below was inspired by the categories that Windows offers for audio streams. These categories allow you to specify what kind of audio stream you want (ex: “speech” for when someone is dictating into a mic), which gives the operating system a chance to optimize the stream for that type of input. After some research, we found that similar categories exist across [Android](https://developer.android.com/reference/android/media/AudioAttributes.html), [iOS](https://developer.apple.com/documentation/avfoundation/avaudiosessionmode?language=objc), and, of course, [Windows](https://docs.microsoft.com/en-us/windows-hardware/drivers/audio/audio-signal-processing-modes).

## Proposed Solution

We plan to follow the lead of native applications across Android, iOS, and Windows, and offer application-based categories for the developer to choose from when acquiring a stream. We will adapt this to the web by modifying the Media Streams API to have ```category``` as a constraint. For operating systems, such as Mac, that do not have one to one mappings of these categories, a best effort approach will be taken to applying categories.

These categories might conflict with existing properties, such as ```noiseSuppression```. In this case, the user agent should apply the category first, then attempt to layer on other properties.

## Proposed API

Add the ```category``` property to ```MediaTrackConstraints```, ```MediaTrackSupportedConstraints```, and ```MediaTrackCapabilities``` objects.

### IDL

[MediaTrackCapabilities](https://w3c.github.io/mediacapture-main/#media-track-capabilities)
```
dictionary MediaTrackCapabilities {
  // Other properties...
  sequence<DOMString> category;
};
```
[MediaTrackConstraints and MediaTrackConstraintSet](https://w3c.github.io/mediacapture-main/#media-track-constraints)
```
dictionary MediaTrackConstraintSet {
  // Other properties...
  sequence<DOMString> category;
};
```
[MediaTrackSettings](https://w3c.github.io/mediacapture-main/#media-track-settings)
```
dictionary MediaTrackSettings {
  // Other properties...
  DOMString category;
};
```
[MediaTrackSupportedConstraints](https://w3c.github.io/mediacapture-main/#media-track-supported-constraints)
```
dictionary MediaTrackSupportedConstraints {
  // Other properties...
  boolean category;
};
```

## Examples

### Example 1: Get an audio stream with the category set to “speech”
```
const constraints = {category: 'speech'}; 
navigator.mediaDevices.getUserMedia({ audio : constraints})
      .then(handleMediaStreamAcquired.bind(this),
          handleMediaStreamAcquiredError.bind(this));

function handleMediaStreamAcquired(mediaStream) {
  /* do something with the mediaStream like record audio */
}

function handleMediaStreamAcquiredError(mediaStreamError) {
  console.log(mediaStreamError);
}
```

### Example 2: Query the browser for support of the “category” property
```
const doesSupportCategories =
    (navigator.mediaDevices.getSupportedConstraints().category != undefined);
```

### Example 3: Query a MediaStreamTrack for the “category” capability
```
const availableCategories = mediaStreamTrack.getCapabilities().category;
console.log(JSON.stringify(availableCategories));
/* [speech, raw, communications, default] */
```
NOTE: All categories should be returned here if the user agent supports ```category```. See 'Fingerprinting Considerations'.

### Example 4: Set the category on an existing MediaStreamTrack
```
const constraints = {category: 'raw'};
mediaStreamTrack.applyConstraints(constraints).then(() => {
  /* do something with the track, such as capture audio */
}).catch(e => {
  console.log(JSON.stringify(e));
});
```

## Fingerprinting Considerations
This API has the potential to be a source of [fingerprinting](https://en.wikipedia.org/wiki/Device_fingerprint) if implemented incorrectly. For example, a site could query a ```MediaStreamTrack```'s capabilities to check the values for the ```category``` property. Since Mac does not have the same capabilities as Windows or Android, the result would only contain 'default', a big hint that the user is on a Mac.

In order to combat this possibility, we are proposing that the categories returned by querying a ```MediaStreamTrack```'s capabilities only reveal what is exposed by the User Agent, not by the underlying platform. This essentially turns a check of ```MediaTrackCapabilities``` into a check of ```MediaTrackSupportedConstraints``` and gives no information about the user's device.
