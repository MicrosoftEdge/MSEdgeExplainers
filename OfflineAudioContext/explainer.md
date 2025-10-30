# WebAudio OfflineAudioContext.startRendering() streaming output

## Authors:

- [Matt Birman](mailto:mattbirman@microsoft.com)

## Table of Contents

[You can generate a Table of Contents for markdown documents using a tool like [doctoc](https://github.com/thlorenz/doctoc).]

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

WebAudio `OfflineAudioContext.startRendering()` allocates an `AudioBuffer` large enough to hold the entire render WebAudio graph before returning. For example, a 4 hour audio graph at 48 kHz with 4 channels will create gigabytes of in-memory float32 data in the `AudioBuffer`. This behaviour makes the API is unsuitable for very long offline renders or very large channel/length combinations. There is no simple way to chunk the output or consume it as a stream.

The [spec](https://webaudio.github.io/web-audio-api/#dom-offlineaudiocontext-startrendering) explicitly says at step 5: "Create a new AudioBuffer ... with ... length and sampleRate ... Assign this buffer to an internal slot" which means the API design currently mandates the full buffer allocation.

The participants on the [GitHub discussion](https://github.com/WebAudio/web-audio-api/issues/2445) agree that incremental delivery of data is necessary. Either streaming chunks of rendered audio or dispatching data in bits rather than everything at once so that memory usage is bounded and the data can be processed/consumed as it is produced.

## User-Facing Problem

The user in this context is the web developer using the WebAudio API. Their goal is to perform media processing using the feature-rich WebAudio API without taking a dependency on a 3rd party library to render the graph in an offline context. Because the current WebAudio OfflineAudioContext API is not suitable for this use case, the developer needs to create a WASM audio processing library or use an existing 3rd party dependency to perform the workload.

### Goals

- Allow streaming data out of an WebAudio `OfflineAudioContext.startRendering()` for rendering large WebAudio graphs faster-than-realtime

### Non-goals

- Change the existing `startRendering()` behavior, this API change is additive

## Proposed Approach

The preferred approach is to add an `outputMode` to `startRendering()` to allow consumers to define the behavior of the offline rendering.

```typescript
interface OfflineAudioContext {
  startRendering(
    outputMode?: "audiobuffer" | "stream" | "none" = "audiobuffer"
  ): Promise<AudioBuffer | ReadableStream | void>;
}
```

In "stream" mode the implementation will not allocate a giant `AudioBuffer` upfront. Instead it will render in quantums (e.g., 128 frames at a time), and enqueue chunks onto a return `ReadableStream`. [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader) will return a reader. `reader.read()` will resolve stream values until it is done and when no more data is available it will set `done = true`. In this mode, the user can read chunks as they arrive and consume them for storage, transcoding via WebCodecs, sending to a server, etc.

Memory usage is bounded by the size of each chunk plus the backlog of unhandled buffers.

### Pros

- Aligns well with other web streaming APIs, similar to [WebCodecs](https://streams.spec.whatwg.org/#readablestream)
- Works with very large durations, no upper limit to WebAudio graph duration
- Flexible usage scenarios for the consumers

### Cons

- Backwards-incompatible as existing code expects an `AudioBuffer` result
- Requires spec change
- Need to define sensible chunk sizes, backpressure, error handling, and end-of-stream

### Implement OfflineAudioContext.startRendering() streaming behaviour with this approach

```js
/*
 * New API
 */

const offlineContext = new OfflineAudioContext(...);
// build up WebAudio graph
const readable: Promise<ReadableStream> = await offlineContext.startRendering("stream");
const reader: ReadableStreamDefaultReader = readable.getReader();
while (true) {
  const result = await reader.read();
  if (result.done) break;
  const buffers = result.value;
}

/*
 * Existing API unchanged
 */
const offlineContext = new OfflineAudioContext(...);
// build up WebAudio graph
const renderedBuffer: Promise<AudioBuffer> = await offlineContext.startRendering();
```

## Alternatives considered

[This should include as many alternatives as you can,
from high level architectural decisions down to alternative naming choices.]

### [Alternative 1]

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
