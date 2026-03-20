# Scroll Timing Performance API

**A proposal to standardize scroll performance measurement on the web.**

## Authors

- [Noam Helfman](https://github.com/nhelfman) (Microsoft)

## Participate

- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1226)

## Table of Contents

- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
  - [User research](#user-research)
- [Proposed Approach](#proposed-approach)
  - [`PerformanceScrollTiming` Interface](#performancescrolltiming-interface)
  - [Attribute Reference](#attribute-reference)
  - [Entry Emission Rules](#entry-emission-rules)
  - [Example Usage with PerformanceObserver](#example-usage-with-performanceobserver)
  - [Dependencies on non-stable features](#dependencies-on-non-stable-features)
  - [Design Notes](#design-notes)
- [Alternatives considered](#alternatives-considered)
- [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)
  - [Accessibility](#accessibility)
  - [Internationalization](#internationalization)
  - [Privacy and Security](#privacy-and-security)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & acknowledgements](#references--acknowledgements)
  - [Open Questions](#open-questions)
  - [Related Work](#related-work)
  - [Polyfill](#polyfill)
  - [Acknowledgements](#acknowledgements)

## Introduction

Scrolling is one of the most fundamental interactions on the web, yet developers lack a consistent, reliable way to measure its performance. The **Scroll Timing API** extends the `PerformanceObserver` pattern to expose critical scroll metrics — including responsiveness, smoothness, frame drops, checkerboarding, velocity, and scroll distance — enabling developers to monitor real-user scroll experiences, diagnose performance issues, and optimize for smooth, engaging interactions.

Try out the API (polyfill) in action: [Demo Page](https://nhelfman.github.io/scroll-timing-api/demo.html)

## User-Facing Problem

Scroll is a very common user interaction in many web apps used for navigating content outside the available viewport or container.

Measuring scroll performance is critical because:

1. **User Experience Impact**: Scroll jank and stuttering are immediately perceptible to users and significantly degrade the browsing experience. Smooth, responsive scrolling is associated with higher perceived quality and user engagement.

2. **Lack of Standardized Metrics**: Currently, developers rely on ad-hoc solutions like `requestAnimationFrame` loops or `IntersectionObserver` hacks to approximate scroll performance, leading to inconsistent measurements across sites and tools.

3. **Real User Monitoring (RUM)**: A standard API enables collecting scroll performance data from real users in production, allowing developers to identify performance issues that may not appear in lab testing.

4. **Correlation with Business Metrics**: Poor scroll performance can correlate with reduced user engagement and lower time-on-page, and may impact conversion rates, especially on content-heavy sites (typically validated via RUM analysis and/or A/B tests).

5. **Framework and Library Support**: A standardized API allows UI frameworks, virtual scrolling libraries, and performance monitoring tools to provide consistent scroll performance insights.

### Goals

- Provide an intuitive Web API for tracking and measuring scroll performance
- Integrate seamlessly with the [PerformanceObserver API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- Ensure cross-platform compatibility across operating systems and browsers
- Expose foundational metrics that enable calculation of derived performance indicators

### Non-goals

- Address general [animation smoothness](../AnimationSmoothness/explainer.md) beyond scroll interactions
- Prescribe explicit performance thresholds or targets (e.g., smoothness scores), as these are context-dependent and vary across use cases

### User research

- [Chrome Graphics Metrics Definitions](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/speed/graphics_metrics_definitions.md)
- [Towards an Animation Smoothness Metric (web.dev)](https://web.dev/articles/smoothness)
- [How Much Faster is Fast Enough?](https://www.tactuallabs.com/papers/howMuchFasterIsFastEnoughCHI15.pdf)
- [Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/)

## Proposed Approach

The Scroll Timing API extends the Performance Observer pattern, consistent with other performance APIs like Long Tasks, Layout Instability, and Event Timing.

### `PerformanceScrollTiming` Interface

```java
interface PerformanceScrollTiming : PerformanceEntry {
  // Inherited from PerformanceEntry
  readonly attribute DOMString entryType;  // Always "scroll"
  readonly attribute DOMString name;       // Always "scroll"

  readonly attribute DOMHighResTimeStamp startTime;
  readonly attribute DOMHighResTimeStamp firstFrameTime;
  readonly attribute DOMHighResTimeStamp duration;
  readonly attribute unsigned long framesExpected;
  readonly attribute unsigned long framesProduced;
  readonly attribute DOMHighResTimeStamp checkerboardTime;
  readonly attribute long deltaX;
  readonly attribute long deltaY;
  readonly attribute DOMString scrollSource;
  readonly attribute Node? target;
};
```

### Attribute Reference

| Attribute | Type | Description |
|-----------|------|-------------|
| `entryType` | DOMString | Always `"scroll"` (inherited from PerformanceEntry) |
| `name` | DOMString | Always `"scroll"` (inherited from PerformanceEntry) |
| `startTime` | DOMHighResTimeStamp | Timestamp of the first input event that initiated the scroll or code invocation timestamp for programmatic scroll|
| `firstFrameTime` | DOMHighResTimeStamp | Timestamp when the first visual frame reflecting the scroll was presented |
| `duration` | DOMHighResTimeStamp | Total scroll duration from `startTime` to the last scroll position change. Entry emission is triggered when: (1) no scroll position changes have occurred for 150ms (inactivity detection), or (2) a scroll end event is explicitly signaled (e.g., `touchend`, `scrollend`). The 150ms timeout is for detecting when scrolling has stopped, but is not included in the duration. Includes momentum/inertia phases. |
| `framesExpected` | unsigned long | Number of frames that would be rendered at the display's refresh rate during the scroll duration. Implementations SHOULD use the actual display refresh rate when available, and MAY fall back to 60Hz as a default. Calculated as `ceil(duration / vsync_interval)`. |
| `framesProduced` | unsigned long | Count of distinct visual updates presented to the display that reflected scroll position changes. A frame is considered "produced" when it is presented and contains a different scroll position than the previous frame. |
| `checkerboardTime` | DOMHighResTimeStamp | Duration (ms) during which any visible area of the scrolled content was not fully painted. Implementations MAY return 0 if unpainted region visibility is not tracked. |
| `deltaX` | long | Horizontal scroll delta in pixels (positive = right, negative = left) |
| `deltaY` | long | Vertical scroll delta in pixels (positive = down, negative = up) |
| `scrollSource` | DOMString | Input method: `"touch"`, `"wheel"`, `"keyboard"`, `"other"`, or `"programmatic"` |
| `target` | Node? | The scrolled node, or `null` if disconnected/in shadow DOM (consistent with Event Timing API) |

**Possible derived metrics** (not part of the interface, can be calculated from attributes):
- **Scroll start latency**: `firstFrameTime - startTime` — responsiveness of scroll initiation
- **Smoothness score**: `framesProduced / framesExpected` — frame delivery consistency (1.0 = perfect)
- **Frames dropped**: `framesExpected - framesProduced` — number of frames skipped or missed
- **Total distance**: `√(deltaX² + deltaY²)` — Euclidean scroll distance
- **Scroll velocity**: `totalDistance / duration * 1000` — scroll speed in pixels per second

### Understanding Frame Counts and Smoothness

**Frame counting during stationary periods:**

The `framesExpected` metric counts all frame opportunities during the scroll `duration`, including periods where scroll velocity is zero (pauses, gaps between discrete events). The `framesProduced` metric only counts frames where the scroll position actually changed.

This means:
- **Very slow scrolls** (less than ~1 pixel per frame) will show lower smoothness scores even if rendering is perfect
- **Pauses mid-gesture** (touch finger stationary, but not lifted) will reduce smoothness scores
- **Discrete scrolls with gaps** (keyboard presses with temporal gaps, combined due to 150ms threshold) include gap frames in expected count

**Why this design?**

This approach provides raw, unfiltered measurements of rendering opportunities vs. actual updates. Developers can combine smoothness with velocity and duration to distinguish:
- **Performance issues**: High velocity + low smoothness = dropped frames
- **Intentional behavior**: Low velocity + low smoothness = slow/paused scroll

Alternative designs that exclude "stationary" frames from `framesExpected` would require arbitrary velocity thresholds and obscure the distinction between "couldn't render" and "no motion."

For advanced use cases, developers can implement custom logic to filter or segment scroll entries based on velocity characteristics before calculating aggregate smoothness metrics.

For detailed discussion of frame counting behavior, see the "Frame Counting and Stationary Periods" section in [DESIGN_NOTES.md](DESIGN_NOTES.md#frame-counting-and-stationary-periods).

### Entry Emission Rules

This section defines when `PerformanceScrollTiming` entries are emitted.

#### Entry Granularity by Scroll Source

Entry emission rules vary by input type to match natural interaction boundaries:

| Scroll Source | Entry Boundary |
|--------------|----------------|
| `"touch"` | One entry per continuous gesture (`touchstart` → `touchend`), split on direction changes |
| `"wheel"` | One entry per scroll interaction; consecutive wheel events are combined into a single entry if they occur within 150ms of each other |
| `"keyboard"` | One entry per key repeat sequence (from `keydown` until key release + 150ms inactivity) |
| `"programmatic"` | One entry per scroll interaction; consecutive programmatic scroll calls (e.g., `scrollTo()`, `scrollBy()`) on the same scrollable element are combined into a single entry if they occur within 150ms of each other |
| `"other"` | One entry per scroll interaction, ending after 150ms of inactivity |

#### Scroll End Detection

A scroll interaction is considered **active** while the user is continuously interacting with a scroll gesture. What constitutes "active interaction" depends on the input type (see table above):
- **Touch**: Finger is touching and moving on the screen
- **Wheel**: Mouse wheel events are being received
- **Keyboard**: Scroll key is held down
- **Other**: Scrollbar is being dragged, or other input method is engaged

A scroll interaction is considered **complete** when:
1. The user is no longer actively interacting AND no scroll position changes have occurred for at least **150 milliseconds** (approximately 9 frames at 60Hz), OR
2. A scroll end event is explicitly signaled (e.g., `touchend` for touch scrolling, `scrollend` event)

This timeout allows momentum/inertia scrolling to be included in the same entry as the initiating gesture.

**150ms timeout mechanics:**

The 150ms inactivity timer starts from the **last scroll position change**, not from the initial input event. This timer determines when to emit the entry, but the **`duration` always ends at the last position change**, not 150ms later. The 150ms is purely a detection mechanism - it's the waiting period to confirm scrolling has stopped, but doesn't represent actual scroll activity.

**Example - Wheel scrolling:**
- Wheel event at `0ms` - this event timestamp becomes `startTime` (`0ms`)
- First visual scroll position change occurs shortly after (e.g., `8ms` = `firstFrameTime`, may be later if jank)
- Scroll position continues changing until `80ms` (last position change)
- Inactivity timer starts at `80ms`
- If another wheel event arrives before `230ms` (`80ms + 150ms`):
  - Events are combined into one entry
  - Timer resets based on when position changes from the new event stop
- If no event arrives by `230ms`: Entry emits with `duration = 80ms` (time to last position change, not including the 150ms wait)

**Example - Keyboard scrolling:**
- Key press at `0ms` - this event timestamp becomes `startTime` (`0ms`)
- First visual scroll position change occurs shortly after (e.g., `10ms` = `firstFrameTime`, may be later if jank)
- Key held until `100ms`, position changes until `120ms`
- Key released at `100ms`
- Inactivity timer starts at `120ms` (last position change)
- If another key press before `270ms` (`120ms + 150ms`): Combined into same entry
- Otherwise entry emits with `duration = 120ms` (time to last position change)

**Example - Scrollbar dragging:**
- User starts dragging scrollbar thumb at `0ms` - this event timestamp becomes `startTime` (`0ms`)
- First visual scroll position change occurs shortly after (e.g., `8ms` = `firstFrameTime`, may be later if jank)
- Continues dragging until `200ms`, scroll position changes continuously
- User releases thumb at `200ms` (last position change)
- Inactivity timer starts at `200ms`
- Entry emits at `350ms` with `duration = 200ms` (time to last position change)

**Example - Autoscroll (middle-click):**
- User middle-clicks to enter autoscroll mode (no entry yet)
- User moves cursor away from anchor point - cursor movement event timestamp becomes `startTime` (`0ms`)
- First visual scroll position change occurs shortly after (e.g., `10ms` = `firstFrameTime`, may be later if jank)
- Autoscroll continues based on cursor position, position changes continuously
- User clicks again to stop autoscroll at `500ms` (last position change)
- Inactivity timer starts at `500ms`
- Entry emits at `650ms` with `duration = 500ms` (time to last position change)
- Note: If user middle-clicks but never moves cursor away (no cursor movement event), no entry is emitted

**Example - Touch scrolling (with pause mid-gesture):**
- User touches screen (`touchstart`) - no entry yet
- User begins dragging finger at `0ms` - this touch gesture timestamp becomes `startTime` (`0ms`)
- First visual scroll position change occurs at `16ms` (`firstFrameTime` - may be later if jank)
- User continues dragging until `200ms`, then pauses (finger still on screen, but not moving)
- Inactivity timer starts at `200ms` (last position change during the pause)
- If user resumes dragging before `350ms` (`200ms + 150ms`): continues as same entry, timer resets
- If no movement by `350ms`: entry emits with `duration = 200ms` (time to last position change), even though finger is still on screen
- Note: `startTime` is the touch gesture event timestamp, not when viewport visually moves (this allows measuring scroll start latency)

**Example - Touch scrolling (lift with momentum):**
- User touches screen and begins dragging - touch gesture timestamp at `0ms` becomes `startTime`
- First visual scroll position change occurs shortly after (e.g., `16ms` = `firstFrameTime`)
- User continues dragging until lifting finger at `300ms` (`touchend`)
- **If no momentum:** Entry emits immediately with `duration = 300ms` (or whenever last position change occurred)
- **If momentum occurs:** Momentum scrolling continues until naturally stopping at `800ms` (last position change), entry emits with `duration = 800ms` (no 150ms timer needed - `touchend` or momentum stopping signals the end)
- Note: If user touches screen but never moves finger (no scroll gesture occurs), no entry is emitted

**Example - Programmatic scrolling (gamepad joystick mapped to scrollBy):**
- User tilts gamepad joystick down, triggering `scrollBy(0, 50)` at `0ms` - this API call timestamp becomes `startTime` (`0ms`)
- First visual scroll position change occurs shortly after (e.g., `10ms` = `firstFrameTime`, may be later if jank)
- Joystick remains tilted, triggering additional `scrollBy(0, 50)` calls every 100ms at `100ms`, `200ms`, `300ms`
- Each call causes position changes, last position change at `350ms`
- User releases joystick at `300ms`
- Inactivity timer starts at `350ms` (last position change)
- If another `scrollBy()` call on the same element before `500ms` (`350ms + 150ms`): Combined into same entry
- Otherwise entry emits at `500ms` with `duration = 350ms` (time to last position change)
- Note: Consecutive programmatic scrolls are only grouped if they target the same scrollable element

#### Direction Change Segmentation

A new scroll timing entry MUST be emitted when the scroll direction reverses (i.e., `deltaX` or `deltaY` changes sign during the scroll). This means a single scroll gesture can produce multiple entries if the user reverses direction mid-scroll.

**Rationale**: Direction reversals represent distinct scroll interactions from a performance measurement perspective, as they may trigger different rendering paths and affect smoothness calculations.

### Example Usage with PerformanceObserver

```javascript
// Create an observer to capture scroll timing entries
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const scrollStartLatency = Math.max(0, entry.firstFrameTime - entry.startTime);
    const smoothnessScore = entry.framesExpected > 0
      ? entry.framesProduced / entry.framesExpected
      : 1;

    // Calculate total distance and velocity from X/Y components
    const totalDistance = Math.sqrt(entry.deltaX ** 2 + entry.deltaY ** 2);
    const scrollVelocity = entry.duration > 0 ? (totalDistance / entry.duration) * 1000 : 0;

    console.log('Scroll performance:', {
      startTime: entry.startTime,
      firstFrameTime: entry.firstFrameTime,
      scrollStartLatency,
      duration: entry.duration,
      smoothnessScore,
      framesDropped: entry.framesExpected - entry.framesProduced,
      checkerboardTime: entry.checkerboardTime,
      deltaX: entry.deltaX,
      deltaY: entry.deltaY,
      totalDistance,
      scrollVelocity,
      source: entry.scrollSource,
      target: entry.target
    });

    // Report to analytics
    if (smoothnessScore < 0.9) {
      reportScrollJank(entry);
    }
  }
});

// Start observing scroll timing entries
observer.observe({ type: 'scroll', buffered: true });
```

### Dependencies on non-stable features

None

### Design Notes

For detailed design rationale and implementation considerations covering scroll start time, scroll end time, smoothness, checkerboarding, velocity, interruption handling, and edge cases, see [DESIGN_NOTES.md](DESIGN_NOTES.md).

## Alternatives considered

### New scroll events
Introduce new scroll-related events with relevant properties to report performance data (e.g., `scrollstart`, `scrollmovementend`, `scrollcheckerboarding`).

This approach presents several drawbacks: it increases implementation complexity as developers must register multiple event listeners on relevant DOM elements, and processing event data on the main thread during active scrolling can negatively impact performance.

### New ScrollObserver
Introduce a dedicated API (e.g., a `ScrollObserver` class) to track and report scroll-related performance information.

This approach would result in substantial overlap with the existing PerformanceObserver API, which could reduce API consistency and increase maintenance complexity.

### Extending [Event Timing API](https://www.w3.org/TR/event-timing/)
Extend the existing `PerformanceEventTiming` interface to include scroll-specific metrics for scroll events.

While this approach would leverage an existing API, scroll interactions have fundamentally different characteristics than discrete events. Scrolling is a continuous interaction that spans multiple frames and requires aggregate metrics (frame counts, smoothness, checkerboarding) that don't align well with the event-based model of Event Timing, which focuses on discrete input events and their processing latency.

## Accessibility, Internationalization, Privacy, and Security Considerations

### Accessibility

This API does not introduce new accessibility concerns as it only exposes information to app developers and not users of the web page.

### Internationalization

1. Scroll Direction and Writing Modes: The `deltaX` and `deltaY` properties use a coordinate system where positive Y is down and positive X is right. This is independent of writing modes (RTL/LTR, vertical writing) and always reflects physical scroll distance in the viewport coordinate space. The API doesn't need to account for logical directions (inline/block) since it measures physical scrolling behavior.
2. `scrollSource` Values: The API uses English string literals ("touch", "wheel", "keyboard", "programmatic", "other") as enumerated values. These are programming identifiers, not user-facing strings, so they don't require localization.
3. No Text or Cultural Content: The API exposes only numerical performance data - timestamps, frame counts, distances, and durations. There are no date formats, number formats, or text strings that would require localization.
4. Universal Performance Metrics: Performance measurements like smoothness, latency, and frame drops are culturally neutral metrics that apply universally across locales.

### Privacy and Security

Performance APIs can expose information that may be used for fingerprinting or side-channel attacks. This section outlines the privacy and security implications of the Scroll Timing API.

#### Fingerprinting Concerns

**Display refresh rate inference:**
The `framesExpected` metric, combined with `duration`, can reveal the device's display refresh rate. For example:
- `framesExpected: 60` over `duration: 1000ms` suggests a 60Hz display
- `framesExpected: 120` over `duration: 1000ms` suggests a 120Hz display

This adds a fingerprinting vector, though display refresh rate is already inferrable via `requestAnimationFrame` timing.

**Hardware performance profiling:**
Frame production patterns (`framesProduced` relative to `framesExpected`) may reveal information about device GPU capabilities, thermal state, or background load, potentially contributing to device fingerprinting.

**Scroll behavior patterns:**
Aggregated scroll metrics (velocity, distance, source) could theoretically be used to profile user behavior patterns, though this requires persistent observation across sessions.

#### Timing Attack Considerations

**High-resolution timestamps:**
The API uses `DOMHighResTimeStamp` for `startTime`, `firstFrameTime`, and `duration`. These are subject to the same timing mitigations applied to other Performance APIs (reduced precision, cross-origin isolation requirements).

#### Cross-Origin Considerations

**Nested iframes:**
When scrolling occurs in a cross-origin iframe, the parent document should not receive `PerformanceScrollTiming` entries for that scroll. Each origin observes only its own scroll interactions.

**`target` attribute:**
The `target` attribute returns an `Element` reference. For cross-origin iframes, this would be `null` or restricted to prevent leaking DOM references across origins.

#### Mitigations

Implementations should consider:
- Applying timestamp precision reduction consistent with other Performance APIs
- Respecting cross-origin isolation boundaries
- Potentially gating detailed metrics behind permissions or secure contexts
- Following existing precedents from Event Timing, Long Tasks, and Layout Instability APIs

## Stakeholder Feedback / Opposition

None reported yet.

## References & acknowledgements

### Open Questions

For detailed discussion of these design decisions, see [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

#### scrollSource classification for fragment navigation and focus/activation-driven scrolling
This still needs to be answered/spec’d: what `scrollSource` value should be reported when scrolling is triggered indirectly by navigation or activation patterns rather than “direct” scrolling input—e.g. scrolling to a header via a `#fragment` in the URL, clicking a table-of-contents link that scrolls the page, activating such a link via keyboard (e.g. Enter/Space), or tabbing through focusable elements where the UA scrolls to keep the focused element in view. Should link-click initiated scrolling map to `"mouse"` (or a new value) rather than `"other"`/`"programmatic"`? If activation is via keyboard, should it map to `"keyboard"` (and does that include Enter/Space)? Related: should focus-navigation scrolling (Tab/Shift+Tab) be reported as `"keyboard"`?

#### Refresh Rate Baseline for Frame Counting
Should `framesExpected` use a standardized 60fps baseline (consistent across devices) or the device's actual refresh rate (accurate to user experience)? This also raises concerns about dynamic refresh rates (VRR displays, browser throttling).

#### Smoothness Scoring Options
Should the API provide a pre-calculated `smoothnessScore`, or only raw frame metrics for developers to calculate their own? Options include simple ratio, harmonic mean, or RMS-based calculations.

#### Scrollbar as a Distinct Scroll Source
Should `"scrollbar"` be added as a distinct `scrollSource` value (and relatedly, do we ever want more specific sources like `"trackpad"`, `"autoscroll"`, etc.)? One motivation for explicit `"scrollbar"` is that scrollbar-driven scrolling can be a major contributor to checkerboarding in practice, and developers may want to segment/diagnose that path specifically. However, adding more granular source values may increase fingerprinting surface by exposing additional details about a user’s input/interaction modality beyond what is commonly available today; this is why the current proposal buckets it with less-common mechanisms into `"other"`. We should discuss whether the diagnostic value outweighs the privacy cost, and if so what mitigations would be acceptable (e.g., keeping coarse buckets, limiting to secure contexts, reducing precision/availability, or only exposing finer-grained sources under additional constraints).

### Polyfill

A demonstration polyfill is provided to illustrate the API usage patterns and enable experimentation before native browser support is available.

See [polyfill.js](polyfill.js) for the full implementation.

**Usage:**
```html
<script src="polyfill.js"></script>
```

**Note:** This polyfill uses heuristics-based approximations due to the lack of relevant native APIs required for accurate scroll performance measurement. It is intended for demonstration and prototyping purposes only. Metrics like checkerboarding detection and precise frame timing cannot be accurately measured without browser-level instrumentation. A native implementation would have access to compositor data, rendering pipeline information, and other internal metrics not exposed to JavaScript.

### Acknowledgements
Many thanks for valuable feedback and advice from: Alex Russel, Mike Jackson, Olga Gerchikov, Andy Luhr, Hoch Hochkeppel, Pninit Goldman, Roee Barnea for guidance and contributions.
