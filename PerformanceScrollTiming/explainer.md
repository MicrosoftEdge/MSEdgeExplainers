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

Scrolling is one of the most fundamental interactions on the web, yet developers lack a consistent, reliable way to measure its performance. The **Scroll Timing API** extends the Performance Observer pattern to expose critical scroll metrics — including responsiveness, smoothness, frame drops, checkerboarding, velocity, and scroll distance — enabling developers to monitor real-user scroll experiences, diagnose performance issues, and optimize for smooth, engaging interactions.

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

- Address general [animation smoothness](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AnimationSmoothness/explainer.md) beyond scroll interactions
- Prescribe explicit performance thresholds or targets (e.g., smoothness scores), as these are context-dependent and vary across use cases

### User research

<!-- TODO: Add any user research conducted, or note if none has been done yet -->

## Proposed Approach

The Scroll Timing API extends the Performance Observer pattern, consistent with other performance APIs like Long Tasks, Layout Instability, and Event Timing.

### `PerformanceScrollTiming` Interface

```java
interface PerformanceScrollTiming : PerformanceEntry {
  // Inherited from PerformanceEntry
  readonly attribute DOMString entryType;  // Always "scroll"
  readonly attribute DOMString name;       // Empty string

  readonly attribute DOMHighResTimeStamp startTime;
  readonly attribute DOMHighResTimeStamp firstFrameTime;
  readonly attribute DOMHighResTimeStamp duration;
  readonly attribute unsigned long framesExpected;
  readonly attribute unsigned long framesProduced;
  readonly attribute double checkerboardTime;
  readonly attribute long distanceX;
  readonly attribute long distanceY;
  readonly attribute DOMString scrollSource;
  readonly attribute Node? target;
};
```

### Attribute Reference

| Attribute | Type | Description |
|-----------|------|-------------|
| `entryType` | DOMString | Always `"scroll"` (inherited from PerformanceEntry) |
| `name` | DOMString | Empty string (inherited from PerformanceEntry) |
| `startTime` | DOMHighResTimeStamp | Timestamp of the first input event that initiated the scroll |
| `firstFrameTime` | DOMHighResTimeStamp | Timestamp when the first visual frame reflecting the scroll was presented |
| `duration` | DOMHighResTimeStamp | Total scroll duration from `startTime` until scrolling stops (includes momentum/inertia) |
| `framesExpected` | unsigned long | Number of frames that should have rendered at the target refresh rate |
| `framesProduced` | unsigned long | Number of frames actually rendered during the scroll |
| `checkerboardTime` | double | Total duration (ms) that unpainted areas were visible during scroll |
| `distanceX` | long | Horizontal scroll distance in pixels (positive = right, negative = left) |
| `distanceY` | long | Vertical scroll distance in pixels (positive = down, negative = up) |
| `scrollSource` | DOMString | Input method: `"touch"`, `"wheel"`, `"keyboard"`, `"other"`, or `"programmatic"` |
| `target` | Node? | The scrolled node, or `null` if disconnected/in shadow DOM (consistent with Event Timing API) |

**Possible derived metrics** (not part of the interface, can be calculated from attributes):
- **Scroll start latency**: `firstFrameTime - startTime` — responsiveness of scroll initiation
- **Smoothness score**: `framesProduced / framesExpected` — frame delivery consistency (1.0 = perfect)
- **Frames dropped**: `framesExpected - framesProduced` — number of frames skipped or missed
- **Total distance**: `√(distanceX² + distanceY²)` — Euclidean scroll distance
- **Scroll velocity**: `totalDistance / duration * 1000` — scroll speed in pixels per second

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
    const totalDistance = Math.sqrt(entry.distanceX ** 2 + entry.distanceY ** 2);
    const scrollVelocity = entry.duration > 0 ? (totalDistance / entry.duration) * 1000 : 0;

    console.log('Scroll performance:', {
      startTime: entry.startTime,
      firstFrameTime: entry.firstFrameTime,
      scrollStartLatency,
      duration: entry.duration,
      smoothnessScore,
      framesDropped: entry.framesExpected - entry.framesProduced,
      checkerboardTime: entry.checkerboardTime,
      distanceX: entry.distanceX,
      distanceY: entry.distanceY,
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

<!-- TODO: List any dependencies on non-stable features, or note if there are none -->

### Design Notes

For detailed design rationale and implementation considerations, see [DESIGN_NOTES.md](DESIGN_NOTES.md).

This document covers:
- **Scroll Start Time**: Measuring input-to-frame latency and responsiveness
- **Scroll End Time**: Detecting interaction completion and momentum scrolling
- **Scroll Smoothness**: Frame production consistency and dropped frame detection
- **Scroll Checkerboarding**: Unpainted content visibility and rasterization timing
- **Scroll Velocity**: Distance and speed metrics for performance correlation
- **Scroll Interruption and Cancellation**: Handling interrupted or switched input sources
- **Edge Cases**: Boundary conditions, zero-distance scrolls, and overscroll behavior

## Alternatives considered

<!-- TODO: Document alternative approaches that were considered and why they were rejected -->

## Accessibility, Internationalization, Privacy, and Security Considerations

### Accessibility

<!-- TODO: Add accessibility considerations -->

### Internationalization

<!-- TODO: Add internationalization considerations -->

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

**Scroll start latency:**
The `firstFrameTime - startTime` delta could potentially reveal main thread blocking time, which might leak information about JavaScript execution in certain contexts.

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

<!-- TODO: Document implementor positions with evidence (links to public statements, bug trackers, etc.) -->

## References & acknowledgements

### Open Questions

For detailed discussion of these design decisions, see [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

#### Refresh Rate Baseline for Frame Counting
Should `framesExpected` use a standardized 60fps baseline (consistent across devices) or the device's actual refresh rate (accurate to user experience)? This also raises concerns about dynamic refresh rates (VRR displays, browser throttling).

#### Smoothness Scoring Options
Should the API provide a pre-calculated `smoothnessScore`, or only raw frame metrics for developers to calculate their own? Options include simple ratio, harmonic mean, or RMS-based calculations.

#### Scrollbar as a Distinct Scroll Source
Should `"scrollbar"` be added as a distinct `scrollSource` value? This raises privacy concerns as no existing web API exposes scrollbar interaction.

### Related Work

- [Chrome Graphics Metrics Definitions](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/speed/graphics_metrics_definitions.md)
- [Towards an Animation Smoothness Metric (web.dev)](https://web.dev/articles/smoothness)

### Polyfill

A demonstration polyfill is provided to illustrate the API usage patterns and enable experimentation before native browser support is available.

See [polyfill.js](polyfill.js) for the full implementation.

**Usage:**
```html
<script src="polyfill.js"></script>
```

**Note:** This polyfill uses heuristics-based approximations due to the lack of relevant native APIs required for accurate scroll performance measurement. It is intended for demonstration and prototyping purposes only. Metrics like checkerboarding detection and precise frame timing cannot be accurately measured without browser-level instrumentation. A native implementation would have access to compositor data, rendering pipeline information, and other internal metrics not exposed to JavaScript.

### Acknowledgements
Many thanks for valuable feedback and advice from: Alex Russel, Mike Jackson, Olga Gerchikov, Andy Luhr for guidance and contributions

<!-- TODO: Add acknowledgements for contributors and reviewers -->
