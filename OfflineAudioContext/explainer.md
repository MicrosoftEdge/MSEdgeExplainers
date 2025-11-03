# WebAudio OfflineAudioContext.startRendering() streaming output

## Authors:

- [Matt Birman](mailto:mattbirman@microsoft.com)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

[WebAudio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) provides a powerful and versatile API for performing audio-processing workflows entirely in the browser. It supports creating complex node-based audio graphs with effects and processing and which are ultimately output to system out (speakers) or an in-memory AudioBuffer for further processing. WebAudio can be used for many different workloads in the browser. An example relevant to this discussion is web-based video editors, like clipchamp.com, which can use WebAudio to build up complex audio graphs based on multiple input files which are composed, trimmed and processed according to a linear timeline, and ultimately rendered faster-than-realtime (offline context) for writing to a file, or realtime for previewing in the browser.

WebAudio works well in a realtime playback context but it is not suitable for offline context processing due to a limitation in the design of WebAudio's [OfflineAudioContext API](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext). The design of the API requires allocating potentially gigabytes of AudioBuffer data before the processed AudioGraph result can be used for other purposes.

This document will propose improvements to the API so that WebAudio can be used for all offline contexts, and by extension, for a broader range of audio processing workloads in the browser.

## User-Facing Problem

The [OfflineAudioContext API](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) works well for rendering small audio graphs but it does not scale for larger projects because it allocates the full graph's AudioBuffer up-front. For example, rendering a 2 hour video composition project in clipchamp.com in an offline context would require an extremely large AudioBuffer allocation. `OfflineAudioContext.startRendering()` allocates an `AudioBuffer` large enough to hold the entire rendered WebAudio graph before returning. In the case of a 2 hour audio graph at 48 kHz with 4 channels, this results in gigabytes of in-memory float32 data in the `AudioBuffer`. This behaviour makes the API unsuitable for very long offline renders or very large channel/length combinations. There is no simple way to chunk the output or consume it as a stream.

The implication of this API design is that an end-user's computer must have enough available memory to render the whole project even if the output will eventually be written to a file. In situations with limited hardware resources or low-powered devices, this limitation makes WebAudio unusable as an offline processor. If memory capacity is exceeded on a user's machine then the processing will stop and the browser may terminate the tab/window leading to potential loss of data for the user and a poor user experience.

Another implication is that video data streamed out of WebCodecs cannot be interleaved easily with audio data because the audio data is delivered as one large chunk at the end of the processing. To use clipchamp.com again as an example, during a video export the process video and audio are muxed into a .mp4 file. The video and audio streams need to be interleaved/muxed in the correct order before writing to the file; the audio data cannot simply be appended at the end. However, as described above, the current OfflineAudioContext API delivers the audio data in a single chunk which means developers need to work through decomposing the stream so that it can be interleaved correctly with the video. If the audio data was streamed out in the same way that video is streamed out of WebCodecs then it would simplify the workflow.

A workaround to this limitations is for developers to build custom WASM audio-processing which can stream out data incrementally so that the full AudioBuffer is not allocated and therefore memory pressure is not applied to a user's machine. While this works around the API constraint, these 3rd party libraries require complex integration, increase maintenance burden, introduce variability across platforms and ultimately duplicate features which already exist in WebAudio, for the sole purpose of providing streaming output.

### Goals

- Allow streaming data out of a WebAudio in an offline context for rendering large audio graphs

### Non-goals

- Change the existing `startRendering()` behavior, this API change is additive

## Proposed Approach - Add `startRenderingStream()` function

The preferred approach is adding a new method `startRenderingStream()` that yields buffers of interleaved audio samples in a Float32Array, or another format as outlined in Open Questions. In this scenario, the user can read chunks as they arrive and consume them for storage, transcoding via WebCodecs, sending to a server, etc.

```js
// From https://developer.mozilla.org/en-US/docs/Web/API/AudioData/format
enum AudioFormat {
    "u8",
    "s16",
    "s32",
    "f32",
    "u8-planar",
    "s16-planar",
    "s32-planar",
    "f32-planar"
}

dictionary OfflineAudioRenderingOptions {
    required AudioFormat format = "f32";
}

partial interface OfflineAudioContext {
    // Returns a stream that yields buffers of interleaved audio samples in Float32Array or whatever format is specified
    Promise<ReadableStream> startRenderingStream(options?: OfflineAudioRenderingOptions);
};
```

Usage example:

```js
const context = new OfflineAudioContext(2, 44100, 44100);

// Add some nodes to build a graph...

const reader = context.startRenderingStream({ format: "f32-planar" }).reader();
while (true) {
  // get the next chunk of data from the stream
  const result = await reader.read();

  // the reader returns done = true when there are no more chunks to consume
  if (result.done) {
    break;
  }

  const buffers = result.value;
}
```

### Pros

- Aligns well with other web streaming APIs, similar to [WebCodecs](https://streams.spec.whatwg.org/#readablestream)
- Works with very large durations, no upper limit to WebAudio graph duration

### Cons

- Need to define sensible chunk sizes, backpressure, error handling, and end-of-stream

### Open questions

#### Output format

What data format should `startRenderingStream()` return?

The options under consideration are `AudioBuffer`, `Float32Array` planar or `Float32Array` interleaved.

- `AudioBuffer` is semantically closest to the `startRendering()` API and does not add a new type to the WebAudio spec but not does not allow developers to BYOB (bring your own buffer). BYOB helps developers manage memory usage So `AudioBuffer` removes a bit of control.
- `Float32Array` planar also already exists, `f32-planar`, in the WebAudio spec. Requires the output of `startStreamingRendering()` to return an array of `Float32Array` in planar format for each output channel. This leaves a question of what to do if only one channel is read by the consumer, what should happen to the other channel's data?
- `Float32Array` interleaved introduces a new type to the WebAudioSpec, `f32-interleaved`, but allows streaming out a single stream, rather than one for each channel as is necessary with `f32-planaer`. It also WebCodecs making it simpler to consume in WebCodecs APIs

## Alternative 1 - Modify existing `startRendering` method to allow streaming output

An alternative approach is to add options to `startRendering()` to configure the operating mode. The mode can be set to `stream` to achieve streaming output. This is similar to the proposed approach but rather than adding a new function, it re-uses the existing `startRendering()` function.

```typescript
interface OfflineAudioRenderingOptions {
    mode: "audiobuffer" | "stream"
}

interface OfflineAudioContext {
    Promise<AudioBuffer | ReadableStream> startRendering(optional: startRenderingOptions);
}
```

#### Implement OfflineAudioContext.startRendering() streaming behaviour with this approach

```js
const offlineContext = new OfflineAudioContext(...);

// ... build up WebAudio graph

const reader = await offlineContext.startRendering(options: { mode: "stream"}).reader();
while (true) {
    // get the next chunk of data from the stream
    const result = await reader.read();

    // the reader returns done = true when there are no more chunks to consume
    if (result.done) {
        break;
    }

    const buffers = result.value;
}
```

The existing API remains unchanged for backwards compatability:

```js
/**
 * Existing API unchanged
 */
const offlineContext = new OfflineAudioContext(...);

// ... build up WebAudio graph

// Full AudioBuffer is allocated
const renderedBuffer = await offlineContext.startRendering();
```

### Pros

- The same pros as the proposed approach

### Cons

- The same cons at the proposed approach
- Less explicit than the proposed approach as it overloads an existing public API function. It is safer and simpler to add a new function and not change the behaviour of an existing function

## Alternative 2: emit `ondataavailable` events

Keep current `startRendering()` API but do not allocate the full `AudioBuffer`. After starting, periodically emit events on the context or a new interface such as `ondataavailable(chunk: AudioBuffer)`.

The user can subscribe and collect chunks for processing.

At the end, the API may optionally still provide a full `AudioBuffer`.

### Pros

- Simple to integrate with existing event-driven patterns

### Cons

- None of note but lacking support in the community discussion

## Accessibility, Internationalization, Privacy, and Security Considerations

[Highlight any accessibility, internationalization, privacy, and security implications
that have been taken into account during the design process.]

## Stakeholder Feedback / Opposition

- Web community : Positive
  The participants on the [GitHub discussion](https://github.com/WebAudio/web-audio-api/issues/2445) agree that incremental delivery of data is necessary. Either streaming chunks of rendered audio or dispatching data in bits rather a single AudioBuffer so that memory usage is bounded and the data can be processed/consumed as it is produced.

## References & acknowledgements

[Your design will change and be informed by many people; acknowledge them in an ongoing way! It helps build community and, as we only get by through the contributions of many, is only fair.]

[Unless you have a specific reason not to, these should be in alphabetical order.]

Many thanks for valuable feedback and advice from:

- [Person 1]
- [Person 2]
- [etc.]

Thanks to the following proposals, projects, libraries, frameworks, and languages
for their work on similar problems that influenced this proposal.

- [Framework 1]
- [Project 2]
- [Proposal 3]
- [etc.]
