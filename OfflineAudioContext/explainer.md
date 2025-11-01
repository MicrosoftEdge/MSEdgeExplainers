# WebAudio OfflineAudioContext.startRendering() streaming output

## Authors:

- [Matt Birman](mailto:mattbirman@microsoft.com)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

WebAudio `OfflineAudioContext.startRendering()` allocates an `AudioBuffer` large enough to hold the entire render WebAudio graph before returning. For example, a 4 hour audio graph at 48 kHz with 4 channels will create gigabytes of in-memory float32 data in the `AudioBuffer`. This behaviour makes the API unsuitable for very long offline renders or very large channel/length combinations. There is no simple way to chunk the output or consume it as a stream.

The [spec](https://webaudio.github.io/web-audio-api/#dom-offlineaudiocontext-startrendering) explicitly states at step 5: "Create a new AudioBuffer ... with ... length and sampleRate ... Assign this buffer to an internal slot" which means the API design currently mandates the full buffer allocation.

The participants on the [GitHub discussion](https://github.com/WebAudio/web-audio-api/issues/2445) agree that incremental delivery of data is necessary. Either streaming chunks of rendered audio or dispatching data in bits rather than everything at once so that memory usage is bounded and the data can be processed/consumed as it is produced.

## User-Facing Problem

The user in this context is the web developer using the WebAudio API to perform media processing workflows. Ideally developers could use the feature-rich WebAudio API for realtime and faster-than-realtime processing, without taking a dependency on a 3rd party library. However, in reality, the current WebAudio OfflineAudioContext API is not suitable for faster-than-raltime processing so the developer needs to create a WASM audio processing library or use an existing 3rd party dependency to achieve this goal.

### Goals

- Allow streaming data out of a WebAudio `OfflineAudioContext.startRendering()` for rendering large WebAudio graphs faster-than-realtime

### Non-goals

- Change the existing `startRendering()` behavior, this API change is additive

## Proposed Approach

The preferred approach is to allow `startRendering()` to be configured to stream output via a `StartRenderingOptions` object which will have a `mode` property. This `mode` can be set to `"stream"` which will stream data rather than allocating an `AudioBuffer` up front.

The object allows for future flexibility of the new API surface.

```typescript
interface StartRenderingOptions {
    mode: "audiobuffer" | "stream"
}

interface OfflineAudioContext {
  startRendering(options?: startRenderingOptions}
  ): Promise<AudioBuffer | ReadableStream | void>;
}
```

If the `startRendering` function is passed `{ mode = "stream" }` then it will render the audio graph in quantums (e.g., 128 frames at a time), and enqueue chunks onto a return `ReadableStream`, rather than rendering the whole graph into an `AudioBuffer` up front as it does currently. `startRendering` will return a [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader) promise. A `reader` can be retrieved off the `ReadableStream` for reading chunks. `reader.read()` will resolve stream values to an `AudioBuffer` until it is done. When no more data is available it will set `done = true`.

In this mode, the user can read chunks as they arrive and consume them for storage, transcoding via WebCodecs, sending to a server, etc. An alternative is to allow BYOB reading, in this case `reader.read()` will return a Float32Array.

Memory usage is bounded by the size of each chunk plus the backlog of unhandled buffers.

### Questions

- What should return of `ReadableStreamDefaultReader.read()` be? Float32Array with BYOB or AudioBuffer?

### Pros

- Aligns well with other web streaming APIs, similar to [WebCodecs](https://streams.spec.whatwg.org/#readablestream)
- Works with very large durations, no upper limit to WebAudio graph duration
- Flexible usage scenarios for the consumers

### Cons

- Requires spec change
- Need to define sensible chunk sizes, backpressure, error handling, and end-of-stream

### Implement OfflineAudioContext.startRendering() streaming behaviour with this approach

#### Option 1: AudioBuffer stream
```js
const offlineContext = new OfflineAudioContext(...);

// ... build up WebAudio graph

const stream = await offlineContext.startRendering(options: { mode: "stream"});
const reader = stream.getReader();
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

#### Option 2: BYOB reading with Float32Array stream
```js
/**
 * New API
 */
const offlineContext = new OfflineAudioContext(...);

// ... build up WebAudio graph

const stream = await offlineContext.startRendering(options: { mode: "stream"});
const reader = stream.getReader({ mode: 'byob' });
let buffer = new ArrayBuffer(...);
while (true) {
    const result = await reader.read(new Float32Array(buffer));

    // the reader returns done = true when there are no more chunks to consume
    if (result.done) {
        break;
    }

    // process result...

    buffer = result.value.buffer;
}
```

In both cases, the existing API remains unchanged for backwards compatability:
```js
/**
 * Existing API unchanged
 */
const offlineContext = new OfflineAudioContext(...);

// ... build up WebAudio graph

// Full AudioBuffer is allocated
const renderedBuffer = await offlineContext.startRendering();
```

## Alternatives considered

### [Alternative 1]

Keep current `startRendering()` API but do not allocate the full `AudioBuffer`. After starting, periodically emit events on the context or a new interface such as `ondataavailable(chunk: AudioBuffer)`.

The user can subscribe and collect chunks for processing.

At the end, the API may optionally still provide a full `AudioBuffer`.

#### Pros

-   Simple to integrate with existing event-driven patterns.

#### Cons


-   Chunking semantics need spec
-   Memory benefit only if user discards chunks but at least this is the in user control

#### Concerns

-   Browser vendors may implement the chunking API but still allocate full buffer internally defeating memory reduction goal unless spec mandates avoiding full allocation.
[Describe an alternative which was considered,
and why you decided against it.
This alternative may have been part of a prior proposal in the same area,
or it may be new.
If you did any research in making this decision, discuss it here.]

### [Alternative 2]

[You may not have decided about some alternatives.
Describe them as open questions here, and adjust the description once you make a decision.]

### [Alternative 3]

[etc.]

## Accessibility, Internationalization, Privacy, and Security Considerations

[Highlight any accessibility, internationalization, privacy, and security implications
that have been taken into account during the design process.]

## Stakeholder Feedback / Opposition

[Implementors and other stakeholders may already have publicly stated positions on this work. If you can, list them here with links to evidence as appropriate.]

- [Implementor A] : Positive
- [Stakeholder B] : No signals
- [Implementor C] : Negative

[If appropriate, explain the reasons given by other implementors for their concerns.]

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
