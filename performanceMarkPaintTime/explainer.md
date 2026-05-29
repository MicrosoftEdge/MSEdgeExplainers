# Paint Timing for `performance.mark()` Explainer

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
  - [What developers can measure](#what-developers-can-measure)
  - [Behavior](#behavior)
  - [Key Design Decisions](#key-design-decisions)
  - [Entry Delivery and Mutability](#entry-delivery-and-mutability)
- [Relationship to Other APIs](#relationship-to-other-apis)
- [Alternatives Considered](#alternatives-considered)
- [Open Questions](#open-questions)
- [Security and Privacy Considerations](#security-and-privacy-considerations)
- [Appendix: Rendering Pipeline and Timing](#appendix-rendering-pipeline-and-timing)
- [Appendix: WebIDL](#appendix-webidl)

## Introduction

Proper measurement and understanding of end-to-end user experience is key to optimizing web performance. Today, the web platform provides several paint timing APIs, each measuring paint timing in different contexts. Some are fully automatic: [FP](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming)/[FCP](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), [LCP](https://www.w3.org/TR/largest-contentful-paint/) and [LoAF](https://w3c.github.io/long-animation-frames/) report milestones the browser selects. Others, like [Element Timing](https://w3c.github.io/element-timing/), let developers annotate specific elements for paint observation. However, the ability for developers to measure their own arbitrary visual updates remains limited.
 
This proposal extends `performance.mark()` with the `paintTiming` option, closing that gap by letting developers capture the actual paint time and presentation time following any JS execution, adding more complete measurement of real end-to-end user experience.

## Goals
 - Give developers on-demand access to paint-related metrics for an arbitrary update, not limited to specific triggers, content types, or page lifecycle milestones.
 - Deliver timestamps through `PerformanceObserver`, consistent with modern performance APIs.

## Non-goals
 - **Replacing existing paint timing entries.** Existing paint timing APIs continue to serve their purposes.
 - **Not forcing a rendering update.** `performance.mark(name, { paintTiming: true })` does not cause a rendering opportunity — it tags the next one that naturally occurs.
 - **Paint attribution / causality.** This API does not attempt to attribute paints to the specific code that caused them.

## The Problem

Existing web performance APIs leave a gap between two kinds of measurement. On one side, [User Timing](https://www.w3.org/TR/user-timing/) (`performance.mark()` / `performance.measure()`) lets developers timestamp arbitrary points in their own JavaScript, but those marks are recorded synchronously  in script and say nothing about when (or whether) the resulting visual update reached the screen. On the other side, paint-related APIs like [FP/FCP](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), [LCP](https://www.w3.org/TR/largest-contentful-paint/), [Element Timing](https://w3c.github.io/element-timing/), [Event Timing](https://w3c.github.io/event-timing/), [LoAF](https://w3c.github.io/long-animation-frames/), and the emerging [Interaction Contentful Paint](https://wicg.github.io/soft-navigations/) do report paint-related timing information, but only for specific scenarios — platform-selected milestones, annotated elements, or interaction-driven updates. Today, developers have no general-purpose way to ask, for any arbitrary visual change: *"when did the update I just made actually paint?"*

Common workarounds like double-rAF or rAF+setTimeout to approximate when the rendering update completes are unreliable (see [Nolan Lawson's analysis](https://nolanlawson.com/2018/09/25/accurately-measuring-layout-on-the-web/)), and none provides `presentationTime` — an implementation-defined presentation timestamp for the frame. Consider a developer measuring when a chat input box appears after an asynchronous content load:

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

### With `performance.mark(name, { paintTiming: true })` option

The following end-to-end example shows a page that loads chat content asynchronously and measures how long it takes for the chat input to be painted and presented to the user:

```html
<!DOCTYPE html>
<html>
<body>
  <div id="app">Loading chat...</div>
  <script>
    // 1. Set up observer to collect marks with paint timing
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.paintTime) {
          console.log(`${entry.name}:`);
          console.log(`  Time to paint:   ${entry.paintTime - entry.startTime}ms`);
          if (entry.presentationTime) {
            console.log(`  Time to present: ${entry.presentationTime - entry.startTime}ms`);
          }
        }
      }
    }).observe({ type: 'mark' });

    // 2. Async content load (e.g., framework rendering a component)
    fetch('/api/chat').then(() => {
      document.getElementById('app').innerHTML =
        '<input class="chat-input" placeholder="Type a message...">';

      // 3. Mark the next paint after this DOM update
      performance.mark('chat-input-rendered', { paintTiming: true });
    });
  </script>
</body>
</html>
```

- **Accurate**: `paintTime` is captured at the rendering update, not approximated by rAF.
- **End-to-end**: `presentationTime`, when available, provides an implementation-defined presentation timestamp for the frame.
- **Stable**: No rAF variance — the timestamps come from the rendering pipeline, not rAF approximation.

## Proposed API

A new `paintTiming` option is added to [`performance.mark()`](https://w3c.github.io/user-timing/#dom-performance-mark):

```js
performance.mark(markName, { paintTiming: true });
```

When `paintTiming` is set, the resulting `PerformanceMark` entry gains two additional attributes from [`PaintTimingMixin`](https://w3c.github.io/paint-timing/#sec-PaintTimingMixin). The entry is delivered to `PerformanceObserver` after the next rendering update, with both values populated.

 | Attribute | Description |
 |-----------|-------------|
 | `paintTime` | When the rendering update completed. `0` when `paintTiming: true` is not set or no paint occurred. |
 | `presentationTime` | When the frame was presented to the screen. `null` when `paintTiming: true` is not set, no paint occurred, or the UA does not support presentation timestamps. |

### What developers can measure
- **`paintTime - startTime`** = time from the `performance.mark(markName, { paintTiming: true })` call to the end of the rendering update.
- **`presentationTime - startTime`** (when `presentationTime` is non-null) = end-to-end visual latency estimate through the implementation-defined presentation timestamp.
- **`presentationTime - paintTime`** (when `presentationTime` is non-null) = pipeline cost from rendering update to display (includes paint, compositing, and GPU presentation). This is less in the developer's control, but can help them understand if they're in an extreme scenario where an outside factor impacted their performance.

### Behavior

- On-demand — no paint timing data is collected until `performance.mark()` is called with `paintTiming: true`.
- One-shot — each call tags the next rendering update and produces exactly one entry.
- Marks with `paintTiming: true` are delivered to `PerformanceObserver` after the rendering update completes, with paint timing values populated. Developers should read `paintTime` and `presentationTime` from the observer callback. See [Entry Delivery and Mutability](#entry-delivery-and-mutability).
- Multiple calls within the same rendering opportunity each produce their own entry with the same `paintTime` and `presentationTime`, but distinct `name` and `startTime`. Calls that span different rendering opportunities produce entries with distinct `paintTime`.
- If the user agent believes that updating the rendering would have no visible effect, the entry is still delivered with `paintTime` set to `0` and `presentationTime` set to `null`. See [Fallback when no paint occurs](#fallback-when-no-paint-occurs).

### Key Design Decisions

- **Extends `performance.mark()` rather than adding a new API**: Reuses the familiar `performance.mark()` interface and the existing `PerformanceMark` entry type. No new entry types or observer types are needed. See [Alternatives Considered](#alternatives-considered).
- **Opt-in via `paintTiming` option**: Only marks that explicitly request paint timing incur the overhead of registering paint callbacks. This opt-in pattern is consistent with other Web Performance APIs that require explicit developer annotation, such as [Element Timing](https://w3c.github.io/element-timing/) (`elementtiming` attribute) and [Container Timing](https://github.com/WICG/container-timing) (`containertiming` attribute).
- **Uses `paintTime` and `presentationTime` timestamps**: These are the same timestamp concepts that FP/FCP/LCP already expose via [`PaintTimingMixin`](https://w3c.github.io/paint-timing/#sec-PaintTimingMixin). Developers who understand paint timing milestones already understand this API. Whether the implementation directly reuses `PaintTimingMixin` or defines equivalent nullable attributes is discussed in [Entry Delivery and Mutability](#entry-delivery-and-mutability).
- **Forward-compatible**: If `PaintTimingMixin` later adds a unified fallback getter such as `renderTime` ([Issue #121](https://github.com/w3c/paint-timing/issues/121)), marks would inherit it automatically through the mixin without API changes.
- **Same object, deferred delivery**: The synchronous return value, `PerformanceObserver`, and `getEntriesByName()` all return the same (`===`) object. Paint timing slots are populated internally by the browser after the rendering update completes. See [Entry Delivery and Mutability](#entry-delivery-and-mutability).

### Entry Delivery and Mutability

`performance.mark()` synchronously returns a `PerformanceMark` with `paintTime` and `presentationTime` unpopulated (`0` / `null`). The same object is accessible via `PerformanceObserver` and `getEntriesByName()` — all three return the identical (`===`) object. After the rendering update completes, the browser fills in the internal slots and notifies the `PerformanceObserver`. Reading these values immediately after `performance.mark()` returns will yield unpopulated values.

#### Fallback when no paint occurs

If the user agent believes that updating the rendering would have no visible effect — for example, the DOM was not modified, the modified content is outside the viewport, or no repaint is needed — the entry is still delivered to the `PerformanceObserver` with `paintTime` set to `0` and `presentationTime` set to `null`. This ensures developers always receive a response to their `performance.mark()` call.

```js
// Developer changes a hidden element, then marks:
hiddenDiv.style.color = 'red';  // not visible
performance.mark('hidden-update', { paintTiming: true });

// Observer still fires:
// entry.paintTime         → 0    (no paint occurred)
// entry.presentationTime  → null (no frame presented)
```

In the observer callback, `paintTime === 0` unambiguously means "no paint occurred" — there is no confusion with "not yet populated", since entries are only delivered after resolution.

This design ensures developers always receive a callback, avoiding "dangling marks" that never resolve. If [PaintTimingMixin](https://w3c.github.io/paint-timing/#sec-PaintTimingMixin) later adds a unified fallback getter such as `renderTime` ([Issue #121](https://github.com/w3c/paint-timing/issues/121)), marks would inherit it automatically through the mixin.

#### Initial value of `paintTime`: non-nullable vs. nullable

Two sub-options exist for the initial (unpopulated) value of `paintTime`:

##### Sub-option A — Non-nullable (reuse PaintTimingMixin)

```js
const mark = performance.mark('my-mark', { paintTiming: true });
mark.paintTime         // 0 (initial, before paint)
mark.presentationTime  // null (initial, before paint)

// After paint, browser fills internal slots:
mark.paintTime         // 165.00
mark.presentationTime  // 172.00 (or null if UA does not support)
```

- Pro: Directly reuses [`PaintTimingMixin`](https://w3c.github.io/paint-timing/#sec-PaintTimingMixin) (`paintTime` is `DOMHighResTimeStamp`, non-nullable).
- Con: Before observer delivery, `0` is ambiguous — it could mean "not yet populated" or "no paint occurred" (see [Fallback when no paint occurs](#fallback-when-no-paint-occurs)). However, since developers should read values from the observer callback (where slots are already resolved), this ambiguity is limited to the synchronous return value.

##### Sub-option B — Nullable (custom attributes)

```js
const mark = performance.mark('my-mark', { paintTiming: true });
mark.paintTime         // null (initial, before paint)
mark.presentationTime  // null (initial, before paint)

// After paint, browser fills internal slots:
mark.paintTime         // 165.00
mark.presentationTime  // 172.00 (or null if UA does not support)
```

- Pro: `null` clearly means "not yet available" — no ambiguity.
- Pro: Consistent — both `paintTime` and `presentationTime` use `null` for the unpopulated state.
- Con: Cannot directly reuse `PaintTimingMixin` (which defines `paintTime` as non-nullable). Uses identical attribute names and semantics, but defined separately on `PerformanceMark`.

#### Alternatives considered and rejected

- **Not returning a value** (returning `null` from `mark()`): Would change the return type of `performance.mark()` from `PerformanceMark` to `PerformanceMark?`, breaking existing code patterns like `performance.mark(...).startTime`.
- **Returning two separate entry objects** (synchronous return + observer entry): Developers would need to correlate two entries by name to get the full picture (mark's `startTime` + paint entry's `paintTime`). If multiple marks share the same name, matching becomes ambiguous.

## Relationship to Other APIs

Several existing APIs provide paint-related timing. This proposal is complementary — it fills a gap none of them cover.

### Element Timing

[Element Timing](https://w3c.github.io/element-timing/) reports the first rendering time of individual elements annotated with the `elementtiming` attribute. It is declarative (HTML-driven), fires once per element (on first paint), and only tracks [timing-eligible](https://w3c.github.io/paint-timing/#timing-eligible) content (images and text). It does not detect subsequent updates to already-painted content, nor does it detect non-text/image changes such as background colors or borders.

`performance.mark()` with `paintTiming: true` is imperative (JS-driven), captures any rendering frame regardless of content type, and works for both initial paints and subsequent updates. It is especially useful in complex applications using frameworks like React, where the actual DOM elements are abstracted away by middleware libraries, making it impractical to add `elementtiming` attributes to the right elements.

### Container Timing

[Container Timing](https://github.com/WICG/container-timing) tracks progressive paint coverage within a DOM subtree annotated with the `containertiming` attribute. It emits entries each time the painted area grows — useful for measuring component visual completeness during page load (e.g., "when is this widget fully rendered?").

However, Container Timing only fires when **new, previously unpainted area** is covered. Repainting the same area (e.g., updating text in place, changing a color) does not trigger a new entry. Like Element Timing, it only detects image and text paints.

`performance.mark()` with `paintTiming: true` captures any visual change — including repaints of existing content — making it suitable for interaction-driven updates where the DOM region doesn't change but the content does.

### Interaction Contentful Paint (ICP)

[Interaction Contentful Paint](https://wicg.github.io/soft-navigations/) reports contentful paint updates within the same document that are initiated by user interactions. It uses [AsyncContext](https://github.com/nicolo-ribaudo/tc39-proposal-await-dictionary) to automatically track causality from an interaction through asynchronous operations to the eventual paint. ICP covers **interaction-triggered** updates comprehensively, but does not cover updates triggered by non-interaction sources (e.g., `fetch()` completions, WebSocket messages, timers, server-sent events).

`performance.mark()` with `paintTiming: true` covers updates triggered by **anything** — whether interaction-driven or not. The two are complementary: ICP provides rich, automatic attribution for interaction-driven paints; paint-timed marks provide a lightweight, imperative mechanism for any scenario.

## Alternatives Considered

### Dedicated `markPaintTime()` API

An earlier version of this proposal introduced a new `performance.markPaintTime(label)` method that would create a new `PerformancePaintTimeMark` entry type:

```javascript
performance.markPaintTime('chat-input-rendered');

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.paintTime - entry.startTime);
  }
}).observe({ type: 'mark-paint-time' });
```

This approach has the advantage of clear intent — a dedicated API for a dedicated purpose — but adds a new entry type and observer type to an already fragmented paint timing landscape. After feedback from the [Web Performance Working Group](https://www.w3.org/webperf/), we moved to extending `performance.mark()` to reuse the existing `PerformanceMark` interface, reducing API surface and avoiding further fragmentation.

### All marks automatically include `paintTime`

Instead of an opt-in `paintTiming` option, every `performance.mark()` call could automatically include `paintTime` and `presentationTime` via `PaintTimingMixin`, with a [fallback value](https://github.com/w3c/paint-timing/issues/121) when no paint occurs:

```javascript
performance.mark('chat-input-rendered');
// paintTime automatically populated (real value or fallback)
```

This approach aligns most closely with the vision of paint timing as a [first-class performance timeline primitive](https://github.com/w3c/performance-timeline/issues/228), allowing every mark to be grouped by frame in per-paint reporting. However:

- **Performance overhead** — every mark registers a paint callback, even marks unrelated to rendering (e.g., `performance.mark('db-query-done')`).
- **Requires fallback behavior** — not yet specified ([Issue #121](https://github.com/w3c/paint-timing/issues/121)).
- **Entry mutation** — marks are created synchronously but `paintTime` would be filled asynchronously. While this is acceptable for opt-in marks (see [Entry Delivery and Mutability](#entry-delivery-and-mutability)), applying it to all marks universally may raise stronger concerns.

We consider opt-in (`paintTiming: true`) the more practical starting point. This is forward-compatible — the opt-in can be removed in the future once fallback behavior and per-paint reporting infrastructure are in place.

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

- **No `presentationTime`** — rPAF fires on the main thread, before compositor and GPU work. For UAs that support `presentationTime`, there is no way to obtain this timestamp through rPAF. For UAs that do not, `paintTime` and a rPAF callback would provide similar timing, though `performance.mark()` with `paintTiming: true` still offers a standardized `PerformanceObserver`-based delivery model.
- **Not being pursued** — the proposal's original author has noted that a post-animation callback may not be useful for optimizing rendering latency, as downstream graphics pipeline latency matters more than hitting a specific VSYNC deadline, and the [proposal is not being pursued](https://github.com/WICG/request-post-animation-frame).

## Open Questions

### paintTime vs. a new "post-paint" timestamp

The current design reuses `paintTime` from PaintTimingMixin, which is captured at [step 11.14.21 of the rendering update](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model) — right before the browser performs the actual paint. This means it does not include the cost of paint itself, so it is not truly the last piece of main-thread work for the frame.

A "post-paint" timestamp — captured after paint completes — would more accurately reflect the total main-thread rendering cost. However:

- **Security concerns**: a post-paint timestamp could expose more precise timing information about rendering complexity, potentially enabling new side-channel attacks.
- **Interoperability**: the HTML spec's update-the-rendering steps do not define a "post-paint" point. This concept does not exist as a spec-level primitive today, making cross-browser agreement uncertain.

We welcome feedback on whether `paintTime` is sufficient for developer needs or whether a post-paint timestamp is worth pursuing despite these tradeoffs.

### Automatic paint timing for all marks

As discussed in [Alternatives Considered](#alternatives-considered), a future direction could make `paintTime` available on all `performance.mark()` entries by default (without `paintTiming: true`), once the [PaintTimingMixin fallback behavior](https://github.com/w3c/paint-timing/issues/121) and [per-paint reporting](https://github.com/w3c/performance-timeline/issues/228) infrastructure are defined. We welcome feedback on whether opt-in or automatic is the right default.

## Security and Privacy Considerations

- The `paintTime` exposed by this API is the same value as `renderTime` in [Element Timing](https://w3c.github.io/element-timing/) and [Container Timing](https://github.com/WICG/container-timing), both of which have undergone security review. The primary difference is the triggering mechanism (JS call vs. HTML attribute), but this does not expose additional information about page content or cross-origin resources.
- `paintTime` and `presentationTime` are subject to the same cross-origin coarsening as existing paint timing entries.
- Timestamps are coarsened to mitigate timing side-channel attacks, consistent with `performance.now()` resolution restrictions.
- The API does not report paint timing for cross-origin iframes or content not within the calling document's origin.

## Appendix: Rendering Pipeline and Timing

`performance.mark()` with `paintTiming: true` captures timestamps at specific points in the browser's rendering pipeline.

### paintTime

`paintTime` is the rendering update end time, captured after style and layout. This is the same timestamp that FP/FCP/LCP use via [PaintTimingMixin](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming), defined at [step 11.14.21 of the event loop](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model).

*Note: Below diagram illustrates the Chromium rendering architecture. Other browser engines may have a different pipeline structure, but the spec-defined timing semantics remain the same.*

![paintTime in the rendering pipeline](paint-time-pipeline.png)

### presentationTime

`presentationTime` is the implementation-defined time when the composited frame is presented to the display. `presentationTime` is not supported by all user agents — it will be `null` when the UA does not implement presentation timestamps. When supported, the exact meaning depends on the operating system. On some platforms, the precise time when pixels are presented to the display is not available, in which case `presentationTime` will report the next closest time, which is typically when the frame is sent to the GPU.

*Note: Below diagram uses Chromium's architecture as an example. Other browser engines may structure this differently, but `presentationTime` refers to the moment the composited frame is presented to the display.*
![presentationTime in the path from rendering to display](presentation-time-pipeline.png)

## Appendix: WebIDL

```webidl
// Extends User Timing spec — https://w3c.github.io/user-timing/
dictionary PerformanceMarkOptions {
  any detail;
  DOMHighResTimeStamp startTime;
  boolean paintTiming = false;   // NEW — opt-in to paint timing
};

// PerformanceMark gains PaintTimingMixin attributes
PerformanceMark includes PaintTimingMixin;

// PaintTimingMixin already defined in Paint Timing spec:
// interface mixin PaintTimingMixin {
//   readonly attribute DOMHighResTimeStamp paintTime;
//   readonly attribute DOMHighResTimeStamp? presentationTime;
// };
//
// For marks without paintTiming: true, paintTime is 0 and
// presentationTime is null.
```
