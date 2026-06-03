# WebAudio OfflineAudioContext incremental rendering

## Authors:

- [Matt Birman](mailto:mattbirman@microsoft.com)
- [Gabriel Brito](mailto:gabrielbrito@microsoft.com)
- [Steve Becker](mailto:stevebe@microsoft.com)

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/OfflineAudioContextStreaming)
- [Discussion forum](https://github.com/WebAudio/web-audio-api/issues/2445)

## Introduction

[WebAudio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) provides a powerful and versatile API for performing audio-processing workflows in the browser. It supports complex node-based audio graphs that can be piped to system out (speakers) or an in-memory AudioBuffer for further processing, such as writing to a file. WebAudio can be used for many different workloads in the browser. An example relevant to this discussion is web-based video editors, like [clipchamp.com](https://clipchamp.com), which can use WebAudio to build up complex audio graphs based on multiple input files. These input files are composed, trimmed and processed according to a linear project timeline. The project can be previewed in realtime in the browser or exported faster-than-realtime as an .mp4.

WebAudio works well in a realtime playback context but it is not suitable for offline context (faster-than-realtime) processing due to a limitation in the design of WebAudio's [OfflineAudioContext API](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext). The design of the API requires allocating memory to render the whole audio graph's memory up-front which can reach gigabytes of AudioBuffer data.

This document proposes expanding the functionality of the offline context rendering function so that the audio graph data can be incrementally processed rather than allocating the whole audio buffer up-front.

## User-Facing Problem

The [OfflineAudioContext API](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) works well for rendering small audio graphs but it does not scale for larger projects because it allocates the full graph's AudioBuffer up-front. For example, rendering a 2 hour video composition project in clipchamp.com in an offline context would require an extremely large AudioBuffer allocation. `OfflineAudioContext.startRendering()` allocates an `AudioBuffer` large enough to hold the entire rendered WebAudio graph before returning. 2 hour of audio at 48 kHz with 4 channels results in gigabytes of in-memory float32 data in the `AudioBuffer`. This makes the API unsuitable for very long offline renders or very large channel/length combinations. There is no simple way to chunk the output or consume it as a stream.

The implication of this API is that a user's computer must have enough available memory to export the project even if the in-memory audio buffer will eventually be discarded after it is written to a file. In situations with limited hardware resources or low-powered devices, this limitation makes WebAudio unusable as an offline processor. If memory capacity is exceeded on a user's machine then the processing will stop and the browser may terminate the tab/window leading to potential loss of data for the user and a poor user experience.

Another implication is that the audio buffer cannot be easily interleaved with video data streamed out of WebCodecs. To use clipchamp.com again as an example, the video and audio are combined into a .mp4 file during the export process. The video and audio streams need to be interleaved/muxed in the correct order before writing to the file; the audio data cannot simply be appended at the end. Ignoring the memory implications of the current API, it is difficult to interleave video and audio when all the audio data is delivered as a single chunk at the end of processing. If the audio data was streamed out at the same time as video data is streamed out of WebCodecs then it would simplify the interleaving process.

A workaround to these limitations is for developers to build custom WASM audio-processing which can stream out data incrementally so that the full AudioBuffer is not allocated and therefore memory pressure is not applied to a user's machine. While this works around the API constraint, these 3rd party libraries require complex integration and increase maintenance burden for developers. Custom WASM libraries duplicate features that already exist in WebAudio and only provide streaming output support as a benefit.

### Goals

- Allow incrementally rendering data out of a OfflineAudioContext for rendering large audio graphs

### Non-goals

- Change the existing `startRendering()` behavior, this API change is additive

## Proposed Approach

We propose modifying the behavior of `startRendering()` in a backwards-compatible manner so that it always renders incrementally in chunks. With this, the current one-shot render scenario becomes a special case of the new behavior where the new `chunkSize` parameter is set to `OfflineAudioContextOptions.length`.

To enable this, we will need to modify `startRendering()` to accept an optional `long chunkSize` argument and `OfflineAudioContextOptions.length` will be allowed to be set to `Infinity`. With this, every call to `startRendering` will now return an `AudioBuffer` that has a maximum number of samples given by `chunkSize`. If `chunkSize` is not provided to `startRendering`, it defaults to:
- The [render quantum size](https://webaudio.github.io/web-audio-api/#render-quantum-size) if `OfflineAudioContextOptions.length` is `Infinity`.
- The `OfflineAudioContextOptions.length` otherwise.

With this proposal, all offline audio rendering is incremental by definition:
- The current one-shot rendering scenario becomes a special case where `OfflineAudioContextOptions.length` is not `Infinity` and `chunkSize` is not specified (defaults to OfflineAudioContextOptions.length).
- Unknown duration rendering is supported by making `OfflineAudioContextOptions.length` equal to `Infinity`. 
- Incremental rendering can be done by calling startRendering multiple times.

For the cases where there is a long ongoing one-shot render or an `Infinity`-length render that needs to stop, users can call `OfflineAudioContext.close()` to stop the rendering. Just like regular `AudioContexts`, the audio context cannot be resumed after `close` is called. Moreover, for the defined-length render case, the context will automatically transition to the `closed` state when all the audio data has been rendered.

Proposed interface:

```js
partial interface OfflineAudioContext {
    Promise<void> close();
    Promise<AudioBuffer> startRendering(optional unsigned long chunkSize);
}
```

Usage example: 

```js
const context = new OfflineAudioContext({
    numberOfChannels: 2,
    sampleRate: 44100,
    length: Infinity
});

// Add some nodes to build a graph...

// Render 5 seconds worth of data.
while (context.currentTime < 5) {
  const buffer = await context.startRendering(/*chunkSize=*/1024);

  processChunk(buffer);
}

// Release resources
context.close();
```

### Pros
- Maintains backwards compatibility.
- Simple to reason about and implement. Callers just need to request chunks whenever they are ready to process them.
- Supports unknown duration rendering.
- Doesn't require integration with the Streams API.

### Cons
- Harder to feature-detect. In contrast, adding a new method would allow checking for its presence `in` the context ("newMethod" in context). Detecting `chunkSize` support requires a try/catch or similar heuristic.
- Evolves the mental model for `startRendering`.

## Alternatives considered

### Alternative 1 - Add `startRenderingStream()` function

This alternative adds a new method `startRenderingStream()` that yields buffers of interleaved audio samples in a Float32Array, or another format as outlined in Open Questions. In this scenario, the user can read chunks as they arrive and consume them for storage, transcoding via WebCodecs, sending to a server, etc.

Usage example:

```js
const context = new OfflineAudioContext({ numberOfChannels: 2, length: 44100, sampleRate: 44100 });

// Add some nodes to build a graph...

if ("startRenderingStream" in context) {
  const reader = context.startRenderingStream({ format: 'f32', chunkSize: 128 }).getReader();
  while (true) {
    // get the next chunk of data from the stream
    const result = await reader.read();

    // the reader returns done = true when there are no more chunks to consume
    if (result.done) {
      break;
    }

    // result.value contains interleaved Float32Array values
    const buffers = result.value;
  }
} else {
  audioBuffer = await offlineAudioContext.startRendering();
}
```

Proposed interface:

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
  // Output format
  AudioFormat format = "f32";
  // The number of frames to render each iteration
  Number chunkSize = 128;
}

partial interface OfflineAudioContext {
    // Immediately stops the rendering, to implement a "cancel" button when rendering 
    // If startRenderingStream was called, this closes the stream
    // If startRendering was called, this rejects the promise
    Promise<void> close();
    // Returns a stream that yields buffers of interleaved audio samples in Float32Array or whatever format is specified
    Promise<ReadableStream> startRenderingStream(optional OfflineAudioRenderingOptions);
};
```

#### Pros

- The new capability is feature detectable because it is a new function. Compared to the proposed approach and alternative 2 which cannot be easily detected.
- Aligns well with other web streaming APIs.
- Works with very large durations, no upper limit to WebAudio graph duration.

#### Cons

- `ReadableStreams` are quite complex both for spec writers and web developers. WebCodecs has decided to decouple their specification from it (more info [here](https://docs.google.com/document/d/10S-p3Ob5snRMjBqpBf5oWn6eYij1vos7cujHoOCCCAw/edit?tab=t.0)).

#### Output format

There is an open question of what data format `startRenderingStream()` should return. The options under consideration are `AudioBuffer`, `Float32Array` planar or `Float32Array` interleaved.

##### `AudioBuffer`

**Pros**

- semantically closest to the `startRendering()` API

**Cons**

- does not allow developers to BYOB (bring your own buffer) and BYOB helps developers manage memory usage, so `AudioBuffer` removes a bit of control

##### Planar Float32Array

**Pros**

- `f32-planar` also already exists in the WebAudio spec

**Cons**

- requires the output of `startStreamingRendering()` to return an array of `Float32Array` in planar format for each output channel
- this leaves a question of what to do if only one channel is read by the consumer, i.e. what should happen to the other channel's data?

##### Interleaved Float32Array

**Pros**

- allows for streaming a single stream of data, rather than one for each channel
- enables BYOB reading

**Cons**

- None of note

### Alternative 2 - Modify existing `startRendering` method to allow streaming output

An alternative approach is to add options to the existing `startRendering()` to configure its operating mode. The mode can be set to `stream` to achieve streaming output. This is similar to alternative 1 but rather than adding a new function, it re-uses an existing function.

Usage example:

```js
const context = new OfflineAudioContext({ numberOfChannels: 2, length: 44100, sampleRate: 44100 });

// Add some nodes to build a graph...

const reader = await context.startRendering(options: { mode: "stream"}).getReader();
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

The existing API remains unchanged for backwards compatibility:

```js
/**
 * Existing API unchanged
 */
const context = new OfflineAudioContext({
  numberOfChannels: 2,
  length: 44100,
  sampleRate: 44100,
});

// Add some nodes to build a graph...

// Full AudioBuffer is allocated
const renderedBuffer = await context.startRendering();
```

Proposed interface:

```js
interface OfflineAudioRenderingOptions {
    mode: "audiobuffer" | "stream"
}

interface OfflineAudioContext {
    Promise<AudioBuffer | ReadableStream> startRendering(optional: startRenderingOptions);
}
```

#### Pros

- The same pros as Alternative 1

#### Cons

- The same cons as Alternative 1
- Unlike Alternative 1, it is not feature detectable because it modifies an existing function.
- Less explicit than Alternative 1 as it overloads an existing public API function. It is safer and simpler to add a new function and not change the behaviour of an existing function

### Alternative 3 - emit `ondataavailable` events

Keep current `startRendering()` API but do not allocate the full `AudioBuffer`. After starting, periodically emit events on the context or a new interface such as `ondataavailable(chunk: AudioBuffer)`.

The user can subscribe and collect chunks for processing.

At the end, the API may optionally still provide a full `AudioBuffer`.

#### Pros

- Simple to integrate with existing event-driven patterns

#### Cons

- None of note but lacking support in the community discussion

## Stakeholder Feedback / Opposition

- Web community : Positive

  The participants on the [GitHub discussion](https://github.com/WebAudio/web-audio-api/issues/2445) agree that incremental delivery of data is necessary. Either streaming chunks of rendered audio or dispatching data in bits rather than a single AudioBuffer so that memory usage is bounded and the data can be processed/consumed as it is produced.

## References & acknowledgements

Many thanks for valuable feedback and advice from:

- [Hongchan Choi](https://github.com/hoch)
- [Paul Adenot](https://github.com/padenot)
- [John Weisz](https://github.com/JohnWeisz)
- [Nishitha Dey](https://github.com/nishitha-burman)
- [Gabriel Brito](https://github.com/gabrielsanbrito)
- [Steve Becker](https://github.com/SteveBeckerMSFT)
- [Jasmine Minter](https://github.com/matanui159)
- [Hayden Warmington](https://github.com/dosatross)
