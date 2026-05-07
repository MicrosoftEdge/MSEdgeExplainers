# performance.markPaintTime() Explainer

Author:  [Wangsong Jin](https://github.com/JosephJin0815), [Andy Luhrs](https://github.com/aluhrs13)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* Current version: this document

## Table of Contents

- [Introduction](#introduction)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [The Problem](#the-problem)
- [Proposed API](#proposed-api)
- [Rendering Pipeline and Timing](#rendering-pipeline-and-timing)
- [Key Design Decisions](#key-design-decisions)
- [Alternatives Considered](#alternatives-considered)
- [Open Questions](#open-questions)
- [Security and Privacy Considerations](#security-and-privacy-considerations)
- [Appendix: WebIDL](#appendix-webidl)

## Introduction

Proper measurement and understanding of end-to-end user experience is key to optimizing web performance. Today, web developers don't have a way to measure when their own visual updates actually reach the screen outside browser-selected milestones like [FP](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), [FCP](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), and [LCP](https://www.w3.org/TR/largest-contentful-paint/). `markPaintTime()` closes that gap by letting developers understand the actual timing of paint and when pixels are drawn to the screen following any of their JS execution, adding more complete measurement of real end-to-end user experience.

*Note: The exact meaning of "drawn to the screen" depends on the operating system. On some platforms, the precise time pixels are presented to the display is not available, in which case `presentationTime` will report the next closest time, which is typically when the frame is sent to the GPU.*

## Goals
 - Give developers on-demand access to various paint-related metrics for an arbitrary update.
 - Deliver timestamps through `PerformanceObserver`, consistent with modern performance APIs.

## Non-goals
 - **Replacing existing paint timing entries.** [FP](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), [FCP](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), [LCP](https://w3c.github.io/largest-contentful-paint/), [Event Timing](https://w3c.github.io/event-timing/), and [LoAF](https://w3c.github.io/long-animation-frames/) continue to serve their existing purposes.
 - **Forcing a rendering update.** `markPaintTime()` does not cause a rendering opportunity — it tags the next one that naturally occurs.

## The Problem

Existing web performance APIs leave a gap between two kinds of measurement. On one side, [User Timing](https://www.w3.org/TR/user-timing/) (`performance.mark()` / `performance.measure()`) lets developers timestamp arbitrary points in their own JavaScript, but those marks are recorded synchronously in script and say nothing about when (or whether) the resulting visual update reached the screen. On the other side, paint-related entries like [FP/FCP](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), [LCP](https://www.w3.org/TR/largest-contentful-paint/), [Event Timing](https://w3c.github.io/event-timing/), and [LoAF](https://w3c.github.io/long-animation-frames/) do report real paint and presentation timestamps, but only for moments the platform selects. Today, developers have no way to ask "when did *this* update I just made actually paint?"

Without an on-demand API, developers resort to workarounds like double-rAF or rAF+setTimeout to approximate when the rendering update completes, but these workarounds are unreliable (see [Nolan Lawson's analysis](https://nolanlawson.com/2018/09/25/accurately-measuring-layout-on-the-web/)). Furthermore, no existing workaround provides `presentationTime` — the actual time when pixels are drawn to the screen. For example, a developer wants to measure when a chat input box appears after an asynchronous content load. A typical pattern uses `requestAnimationFrame` to approximate the paint time:

### Single requestAnimationFrame

```html
<!DOCTYPE html>
<html>
<body>
  <div id="app">Loading chat...</div>
  <script>
    fetch('/api/chat').then(() => {
      document.getElementById('app').innerHTML =
        '<input class="chat-input" placeholder="Type a message...">';

      requestAnimationFrame(() => {
        performance.mark('chat-input-rendered');
      });
    });
  </script>
</body>
</html>
```

Since `requestAnimationFrame` callbacks run before the style and layout, the recorded timestamp is earlier than when the content is actually rendered. It is better than logging at the moment of the DOM update, but still only an approximation.

### Double requestAnimationFrame

```javascript
fetch('/api/chat').then(() => {
  document.getElementById('app').innerHTML =
    '<input class="chat-input" placeholder="Type a message...">';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      performance.mark('chat-input-rendered');
    });
  });
});
```

The second rAF fires after the first frame's paint, getting closer to the actual paint time. However, there is no guarantee that this captures the frame that corresponds to the change. This gets worse when observers (e.g., `ResizeObserver`, `IntersectionObserver`) are present — their callbacks add work between frames, making the second rAF even less likely to land on the expected frame.

### requestAnimationFrame + setTimeout

```javascript
fetch('/api/chat').then(() => {
  document.getElementById('app').innerHTML =
    '<input class="chat-input" placeholder="Type a message...">';

  requestAnimationFrame(() => {
    setTimeout(() => {
      performance.mark('chat-input-rendered');
    }, 0);
  });
});
```

This defers the mark to the next task after the rAF callback, which is more likely to land after the paint. However, the overshoot is non-deterministic due to other queued tasks — the timestamp ends up well past the actual frame, making the measurement less precise.

### With markPaintTime

The following end-to-end example shows a page that loads chat content asynchronously and measures how long it takes for the chat input to be painted and presented to the user:

```html
<!DOCTYPE html>
<html>
<body>
  <div id="app">Loading chat...</div>
  <script>
    // 1. Set up observer to collect paint timing entries
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(`${entry.name}:`);
        console.log(`  Time to paint:   ${entry.paintTime - entry.startTime}ms`);
        if (entry.presentationTime) {
          console.log(`  Time to present: ${entry.presentationTime - entry.startTime}ms`);
        }
      }
    }).observe({ type: 'mark-paint-time' });

    // 2. Async content load (e.g., framework rendering a component)
    fetch('/api/chat').then(() => {
      document.getElementById('app').innerHTML =
        '<input class="chat-input" placeholder="Type a message...">';

      // 3. Mark the next paint after this DOM update
      performance.markPaintTime('chat-input-rendered');
    });
  </script>
</body>
</html>
```

- **Accurate**: `paintTime` is captured at the rendering update, not approximated by rAF.
- **End-to-end**: `presentationTime`, when available, tells you when pixels are drawn to the screen.
- **Stable**: No rAF variance — the timestamps come from the rendering pipeline, not rAF approximation.

## Proposed API

`performance.markPaintTime(markName)` tags the next rendering update with a developer-chosen name. The browser then delivers a `PerformancePaintTimeMark` entry through `PerformanceObserver` with the following properties:

 | Attribute | Description |
 |-----------|-------------|
 | `entryType` | Always `"mark-paint-time"` |
 | `name` | The mark name passed to `markPaintTime()` |
 | `startTime` | `performance.now()` at the time `markPaintTime()` was called, unless overridden via `options.startTime` — same semantics as [`performance.mark()`](https://w3c.github.io/user-timing/#the-performancemark-constructor) (see [step 5](https://w3c.github.io/user-timing/#the-performancemark-constructor)). This is **not** a rendering-pipeline timestamp; it records when the developer invoked the API, regardless of where in the event loop the call occurs (e.g., a microtask, `IntersectionObserver` callback, or `requestAnimationFrame`). |
 | `duration` | Always `0` |
 | `paintTime` | The rendering update end time — same as FP/FCP/LCP `paintTime` |
 | `presentationTime` | When pixels were drawn to the screen, or `null` if unsupported by the UA — same as FP/FCP/LCP `presentationTime` |

**Behavior:**
- On-demand — no data is collected until `markPaintTime()` is called.
- One-shot — each call tags the next rendering update and produces exactly one entry.
- Multiple calls within the same rendering opportunity each produce their own entry with the same `paintTime` and `presentationTime`, but distinct `name` and `startTime`. Calls that span different rendering opportunities produce entries with distinct `paintTime`. `presentationTime` values depend on when the compositor presents frames to the display and may vary independently.
- If `options.startTime` is provided, it is used as the entry's `startTime`; if negative, a `TypeError` is thrown. Otherwise, `startTime` defaults to `performance.now()` at call time — consistent with [`performance.mark()`](https://w3c.github.io/user-timing/#the-performancemark-constructor).
- `presentationTime` may be `null` when the user agent does not support implementation-defined presentation timestamps, consistent with [`PaintTimingMixin`](https://w3c.github.io/paint-timing/#sec-PaintTimingMixin).

The entry reuses [`PaintTimingMixin`](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming) from the Paint Timing spec, so `paintTime` and `presentationTime` have identical semantics to the timestamps developers already see on FP, FCP, and LCP entries.

## Rendering Pipeline and Timing

`markPaintTime()` captures timestamps at specific points in the browser's rendering pipeline.

### paintTime

`paintTime` is the rendering update end time, captured after style and layout. This is the same timestamp that FP/FCP/LCP use via [PaintTimingMixin](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), defined at [step 11.14.21 of the event loop](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model).

*Note: Below diagram illustrates the Chromium rendering architecture. Other browser engines may have a different pipeline structure, but the spec-defined timing semantics remain the same.*

![paintTime in the rendering pipeline](paint-time-pipeline.png)

### presentationTime

`presentationTime` is the implementation-defined time when the composited frame is presented to the display.

*Note: Below diagram uses Chromium's architecture as an example. Other browser engines may structure this differently, but `presentationTime` refers to the moment the composited frame is presented to the display.*
![presentationTime in the path from rendering to display](presentation-time-pipeline.png)

### What developers can measure

- **`startTime`**: Defaults to `performance.now()` at the time `markPaintTime()` is called, but developers can optionally provide a custom value to mark a meaningful start point (e.g., an event timestamp from a `click` or `input` event, or a timestamp captured at the start of a state change).
- **`paintTime - startTime`** = time from the `markPaintTime()` call to the end of the rendering update.
- **`presentationTime - startTime`** (when `presentationTime` is non-null) = end-to-end visual latency (how long until the user actually sees the update).
- **`presentationTime - paintTime`** (when `presentationTime` is non-null) = pipeline cost from rendering update to display (includes paint, compositing, and GPU presentation). This is less in the developer's control, but can help them understand if they're in an extreme scenario where an outside factor impacted their performance.

## Key Design Decisions

- **Reuses PaintTimingMixin**: No new timestamp concepts — `paintTime` and `presentationTime` are the same timestamps that FP/FCP/LCP already expose. Developers who understand paint timing milestones already understand this API.
- **On-demand**: Unlike FP/FCP/LCP which fire automatically for browser-detected milestones, `markPaintTime()` is triggered by the developer for any visual update at any time.
- **PerformanceObserver-based**: Consistent with modern performance APIs (LoAF, FCP, LCP).

## Alternatives Considered

### requestPostAnimationFrame (rPAF)

`requestPostAnimationFrame` fires immediately after the rendering update completes. Using it for the same chat-input example:

```javascript
fetch('/api/chat').then(() => {
  document.getElementById('app').innerHTML =
    '<input class="chat-input" placeholder="Type a message...">';

  requestPostAnimationFrame(() => {
    performance.mark('chat-input-rendered');
  });
});
```

This would approximate `paintTime` more accurately than double-rAF, since the callback fires right after paint rather than at the start of the next frame. However:

- **No `presentationTime`** — rPAF fires on the main thread, before compositor and GPU work. For UAs that support `presentationTime`, there is no way to obtain this timestamp through rPAF. For UAs that do not, `paintTime` and a rPAF callback would provide similar timing, though `markPaintTime()` still offers a standardized `PerformanceObserver`-based delivery model.
- **Not being pursued** — the proposal's original author has noted that a post-animation callback may not be useful for optimizing rendering latency, as downstream graphics pipeline latency matters more than hitting a specific VSYNC deadline, and the [proposal is not being pursued](https://github.com/WICG/request-post-animation-frame).

## Open Questions

### paintTime vs. a new "post-paint" timestamp

The current design reuses `paintTime` from PaintTimingMixin, which is captured at [step 11.14.21 of the rendering update](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model) — right before the browser performs the actual paint. This means it does not include the cost of paint itself, so it is not truly the last piece of main-thread work for the frame.

A "post-paint" timestamp — captured after paint completes — would more accurately reflect the total main-thread rendering cost. However:

- **Security concerns**: a post-paint timestamp could expose more precise timing information about rendering complexity, potentially enabling new side-channel attacks.
- **Interoperability**: the HTML spec's update-the-rendering steps do not define a "post-paint" point. This concept does not exist as a spec-level primitive today, making cross-browser agreement uncertain.

We welcome feedback on whether `paintTime` is sufficient for developer needs or whether a post-paint timestamp is worth pursuing despite these tradeoffs.

### API naming: `markPaintTime()` vs. alternatives

The current name `markPaintTime()` mirrors `performance.mark()`, but unlike `mark()` — which records a timestamp synchronously — `markPaintTime()` schedules observation of a future rendering update. This mismatch could mislead developers into thinking the timestamp is captured at call time.

Alternative names that better signal deferred capture:

- **`markNextPaint()`** — emphasizes that the mark targets the *next* rendering opportunity, not the current moment.
- **`observeNextPaint()`** — aligns with the observation pattern (`PerformanceObserver`) and makes the asynchronous nature explicit.

We welcome feedback on whether the current naming is clear enough or whether a rename would reduce developer confusion.

## Security and Privacy Considerations

- `paintTime` and `presentationTime` are subject to the same cross-origin coarsening as existing paint timing entries.
- Timestamps are coarsened to mitigate timing side-channel attacks, consistent with `performance.now()` resolution restrictions.

## Appendix: WebIDL

```webidl
// Extends Paint Timing spec — https://w3c.github.io/paint-timing/
dictionary MarkPaintTimeOptions {
  DOMHighResTimeStamp startTime;
};

partial interface Performance {
  undefined markPaintTime(DOMString markName, optional MarkPaintTimeOptions options = {});
};

[Exposed=Window]
interface PerformancePaintTimeMark : PerformanceEntry {
  [Default] object toJSON();
};
PerformancePaintTimeMark includes PaintTimingMixin;

// PaintTimingMixin already defined in Paint Timing spec:
// interface mixin PaintTimingMixin {
//   readonly attribute DOMHighResTimeStamp paintTime;
//   readonly attribute DOMHighResTimeStamp? presentationTime;
// };
```
