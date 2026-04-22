# performance.markPaintTime() Explainer

Authors:  [Wangsong Jin](https://github.com/JosephJin0815) - Engineer at Microsoft Edge

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
- [Security and Privacy Considerations](#security-and-privacy-considerations)
- [Appendix: WebIDL](#appendix-webidl)

## Introduction

Web developers need to measure when their visual updates actually render — not just the browser-detected milestones like First Paint or Largest Contentful Paint, but any update they care about: a component mount, a state transition, a style change.

The platform already captures paint and presentation timestamps for key moments via PaintTimingMixin, but only for entries the browser selects automatically. `performance.markPaintTime()` extends this capability to let developers capture the same `paintTime` and `presentationTime` for any visual update, on demand.

## Goals
 - Give developers on-demand access to `paintTime` and `presentationTime` for any visual update.
 - Deliver timestamps through `PerformanceObserver`, consistent with modern performance APIs.

## Non-goals
 - **Replacing existing paint timing entries.** FP, FCP, LCP, Event Timing, and LoAF continue to serve their existing purposes.
 - **Forcing a rendering update.** `markPaintTime()` does not cause a rendering opportunity — it tags the next one that naturally occurs.

## The Problem

Without an on-demand API, developers resort to workarounds like double-rAF or rAF+setTimeout to approximate when the rendering update completes, but these workarounds are unreliable (see [Nolan Lawson's post](https://nolanlawson.com/2015/09/29/the-difference-between-throttling-and-debouncing/)). Furthermore, no workaround can provide `presentationTime` — the actual time when pixels appear on screen. For example, a developer measuring when a virtual DOM (vdom) change actually lands on the real DOM and renders:

### Double requestAnimationFrame

```javascript
// React component measuring vdom → DOM rendering
function MyComponent() {
  useLayoutEffect(() => {
    // useLayoutEffect fires after React's DOM commit but before the browser's
    // rendering update. Resort to double-rAF to approximate paint timing.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        performance.mark('component-rendered');
      });
    });
  });
}
```

This is a widely-used approach to approximate when a vdom change actually lands on the DOM. However, we cannot be guaranteed that we are looking at the frame that corresponds to the change 100% of the time. This gets worse when observers (e.g., ResizeObserver, IntersectionObserver) are present — their callbacks add work between frames, making the second rAF even less likely to land on the expected frame.

### requestAnimationFrame + setTimeout

```javascript
// Alternative approach used with React useLayoutEffect
function MyComponent() {
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        performance.mark('component-rendered');
      }, 0);
    });
  });
}
```

This is more accurate but less precise because now we are well past the frame in the next task. The overshoot is non-deterministic due to other queued tasks.

Both approaches presuppose React via `useLayoutEffect` to measure "on DOM and interactive." Both workarounds exist because there is no API to get paint timing for arbitrary visual updates.

### With markPaintTime:

```javascript
function MyComponent() {
  useLayoutEffect(() => {
    performance.markPaintTime("component-rendered");
  });
}

// Observe the result
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // paintTime — captured during the rendering opportunity, after style+layout
    // presentationTime — the time when pixels were actually shown on display
    console.log(`Paint time: ${entry.paintTime}ms`);
    console.log(`Presentation time: ${entry.presentationTime}ms`);
    console.log(`Rendering latency: ${entry.paintTime - entry.startTime}ms`);
  }
});
observer.observe({ type: "mark-paint-time" });
```

Benefits:
- **Accurate time**: No idle time gap, no task queue delay.
- **Main-thread rendering cost**: `paintTime - startTime` captures the time from the call to the paint phase of the rendering update.
- **End-to-end visual latency**: `presentationTime - startTime` captures the full latency until pixels are actually shown on the display.

## Proposed API

`performance.markPaintTime(markName)` tags the next rendering update with a developer-chosen name. The browser then delivers a `PerformancePaintTimeMark` entry through `PerformanceObserver` with the following properties:

 | Attribute | Description |
 |-----------|-------------|
 | `entryType` | Always `"mark-paint-time"` |
 | `name` | The mark name passed to `markPaintTime()` |
 | `startTime` | `performance.now()` at the time `markPaintTime()` was called |
 | `duration` | Always `0` |
 | `paintTime` | The rendering update end time — same as FP/FCP/LCP `paintTime` |
 | `presentationTime` | When pixels were actually shown on the display — same as FP/FCP/LCP `presentationTime` |

The entry reuses [`PaintTimingMixin`](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming) from the Paint Timing spec, so `paintTime` and `presentationTime` have identical semantics to the timestamps developers already see on FP, FCP, and LCP entries.

## Rendering Pipeline and Timing

`markPaintTime()` captures timestamps at specific points in the browser's rendering pipeline.

### paintTime

`paintTime` is the rendering update end time, captured after style recalculation and layout. This is the same timestamp that FP/FCP/LCP use via [PaintTimingMixin](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), defined at [step 11.14.21 of the event loop](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model).

![paintTime in the rendering pipeline](paint-time-pipeline.png)

### presentationTime

`presentationTime` is the time when the composited frame is actually presented to the display — the next hardware display refresh that contains the updated content.

![presentationTime in the rendering pipeline](presentation-time-pipeline.png)

### What developers can measure

- **`startTime`**: `performance.now()` at the time `markPaintTime()` is called.
- `paintTime - startTime` = main-thread rendering cost (how long until the browser finished processing the visual update)
- `presentationTime - startTime` = end-to-end visual latency (how long until the user actually sees the update)
- `presentationTime - paintTime` = off-main-thread cost (compositor + GPU time)

## Key Design Decisions

- **Reuses PaintTimingMixin**: No new timestamp concepts — `paintTime` and `presentationTime` are the same timestamps that FP/FCP/LCP already expose. Developers who understand paint timing milestones already understand this API.
- **On-demand**: Unlike FP/FCP/LCP which fire automatically for browser-detected milestones, `markPaintTime()` is triggered by the developer for any visual update at any time.
- **PerformanceObserver-based**: Consistent with modern performance APIs (LoAF, FCP, LCP).

## Alternatives Considered

### requestPostAnimationFrame (rPAF)

`requestPostAnimationFrame` by design fires immediately after the rendering update completes. Calling `performance.now()` inside the callback could approximate `paintTime`, but:

- Cannot provide `presentationTime` — rPAF fires on the main thread, before compositor/GPU work.
- The proposal's original author has concluded that a post-animation callback is not actually useful for its intended purpose (optimizing rendering latency), and the proposal is not being pursued.

## Security and Privacy Considerations

- `paintTime` and `presentationTime` are subject to the same cross-origin coarsening as existing paint timing entries.
- Timestamps are coarsened to mitigate timing side-channel attacks, consistent with `performance.now()` resolution restrictions.

## Appendix: WebIDL

```webidl
// Extends Paint Timing spec — https://w3c.github.io/paint-timing/
partial interface Performance {
  undefined markPaintTime(DOMString markName);
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
