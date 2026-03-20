# Open Questions

This document contains detailed discussion of unresolved design decisions for the Scroll Timing API. For a summary, see the [README](README.md#open-questions).

## Refresh Rate Baseline for Frame Counting

**Question:** Should the API calculate expected frames based on a standardized baseline (e.g., 60fps) or use the device's actual refresh rate?

**Context:**
- The `framesExpected` and `framesProduced` metrics aim to quantify scroll smoothness
- Different approaches have different tradeoffs:

**Option A: Standardized 60fps baseline**
- **Pros:**
  - Consistent metrics across all devices and refresh rates
  - Easier to compare scroll performance between different hardware
  - Simpler mental model: "90% smoothness" means the same thing everywhere
  - Matches most existing performance tools and metrics
- **Cons:**
  - On high refresh rate displays (90Hz, 120Hz, 144Hz), smooth scrolling would appear to have "extra" frames and show >100% smoothness
  - On throttled environments (30fps, 32fps), even perfectly smooth scrolling would show low smoothness scores (~50%)
  - Doesn't reflect actual user experience on non-60Hz displays

**Option B: Device actual refresh rate**
- **Pros:**
  - Accurately reflects whether frames are being dropped relative to what the display can show
  - Better represents actual user experience on that specific device
  - Works correctly in throttled scenarios (DevTools open, background tabs, power saving)
- **Cons:**
  - Metrics not directly comparable across devices (90% on 60Hz ≠ 90% on 120Hz in absolute terms)
  - Adds complexity: developers need to know the refresh rate to interpret metrics
  - Different users on different hardware would report different "smoothness" for identical code

**Polyfill implementation:**
The current polyfill measures the actual refresh rate on page load using `requestAnimationFrame` sampling and uses that for frame expectations. This was necessary to avoid reporting false jank in throttled environments (where browsers run at ~32fps instead of 60fps).

**Recommendation needed:**
This decision affects the API design and should be resolved before standardization. Consider:
- Are these metrics primarily for RUM (real user monitoring) where actual experience matters?
- Or for lab testing where cross-device comparison is critical?
- Should there be separate metrics for both approaches?
- Could `framesExpected` include the target refresh rate as context?

### Related Concern: Dynamic Refresh Rates

In addition to choosing between a standardized baseline or device refresh rate, there's a related consideration: **refresh rates are not static throughout a page's lifetime**.

**Variable Refresh Rate (VRR) displays:**
- Technologies like Adaptive Sync, FreeSync, and G-Sync allow displays to dynamically adjust refresh rates (typically 48-240Hz)
- Refresh rate varies based on content, power state, GPU load, and application demands
- Increasingly common in gaming laptops, high-end monitors, and mobile devices

**Dynamic browser throttling:**
- Opening/closing DevTools often changes rendering rate (e.g., 60fps → 32fps)
- Tab backgrounding reduces to ~1fps or lower
- Battery saver modes and power state changes affect rendering pipeline timing
- Performance settings can be changed by users mid-session

**Impact on API design:**

If the API uses Option B (device actual refresh rate), how should it handle changes mid-session?
- Should each `PerformanceScrollTiming` entry snapshot the refresh rate at scroll start?
- Should browsers continuously track refresh rate changes during a scroll interaction?
- If a fixed baseline is measured once, it becomes stale when throttling changes (leading to incorrect `framesExpected` and false jank reports)

Alternatively, does this complexity make Option A (standardized 60fps baseline) more attractive, since it avoids the dynamic measurement problem entirely?

**Considerations for implementation:**
- Native browser implementations have direct access to compositor and display information, making refresh rate tracking more feasible than JavaScript-based measurement
- However, the API specification should still be explicit about whether and when refresh rate is determined
- This concern may influence whether Option A or Option B is ultimately chosen

## Smoothness Scoring Options

**Philosophy:** This API intentionally provides raw frame metrics (`framesExpected`, `framesProduced`, `framesDropped`) rather than a single "smoothness score." Different use cases may require different calculation methods, and prescribing a specific formula could limit flexibility or become outdated as best practices evolve.

### Available Metrics for Smoothness Calculation

The API provides these building blocks:
- `framesExpected`: Frames that should have rendered at the target refresh rate
- `framesProduced`: Frames actually rendered
- `framesDropped`: Frames skipped (`framesExpected - framesProduced`)
- `duration`: Total scroll duration in milliseconds

### Calculation Options

#### Option 1: Simple Ratio (Frame Throughput)

**Formula:** `smoothness = framesProduced / framesExpected`

- **Pros:** Simple, intuitive, easy to explain
- **Cons:** Treats all dropped frames equally regardless of when they occur; doesn't capture variance in frame timing

**Example:**
```javascript
const smoothness = entry.framesProduced / entry.framesExpected;
// 54 frames produced out of 60 expected = 90% smoothness
```

#### Option 2: Harmonic Mean of Frame Rates

**Formula:** `smoothness = n / (Σ(1/fps_i))` where `fps_i` is instantaneous FPS per frame

The harmonic mean weights lower frame rates more heavily, better reflecting perceived smoothness. A single slow frame has a disproportionate impact on the final score.

- **Pros:** Better reflects perceived smoothness; low frame rates impact the score more (matching human perception)
- **Cons:** Requires per-frame timing data; more complex to compute

**Example:**
```javascript
// If you have individual frame times [16ms, 16ms, 50ms, 16ms]
// Frame rates: [62.5, 62.5, 20, 62.5]
// Arithmetic mean: 51.9 FPS
// Harmonic mean: 4 / (1/62.5 + 1/62.5 + 1/20 + 1/62.5) = 37.0 FPS
// The harmonic mean better reflects the impact of that one slow frame
```

#### Option 3: RMS (Root Mean Square) of Frame Times

**Formula:** `rms = √(Σ(frameTime_i²) / n)`

RMS penalizes longer frames quadratically, making outlier frames (jank) more impactful in the final metric.

- **Pros:** Properly penalizes long frames; mathematically simpler than percentile-based metrics; has a clear definition
- **Cons:** Requires per-frame timing data; result is in milliseconds (needs comparison to target frame time)

**Example:**
```javascript
// Frame times: [16ms, 16ms, 50ms, 16ms]
// Arithmetic mean: 24.5ms
// RMS: √((16² + 16² + 50² + 16²) / 4) = √(3268/4) = 28.6ms
// Can derive smoothness: targetFrameTime / rms = 16 / 28.6 = 56%
```

### Should the API Provide Pre-Calculated Smoothness?

**Question:** Should `PerformanceScrollTiming` include a `smoothnessScore` property, or only expose raw metrics for developers to calculate their own?

**Option A: Raw metrics only**
- **Pros:**
  - Developers choose the calculation method appropriate for their use case
  - API remains flexible as best practices evolve
  - Avoids debates about which formula is "correct"
  - Smaller API surface
- **Cons:**
  - More work for developers; may lead to inconsistent implementations
  - Harder to compare metrics across different sites/tools

**Option B: Provide a default smoothness score**
- **Pros:**
  - Consistent metric across the ecosystem
  - Easier adoption; works out of the box
  - Can be optimized by browsers using internal data (compositor timing, vsync alignment)
- **Cons:**
  - Locks the API to a specific calculation method
  - May not suit all use cases
  - Harder to change once standardized

**Option C: Provide both raw metrics and a standardized score**
- **Pros:**
  - Best of both worlds: consistency for simple use cases, flexibility for advanced users
  - Allows ecosystem to converge on standardized score while enabling research
- **Cons:**
  - Larger API surface
  - May cause confusion about which to use

**Additional consideration:** If providing a pre-calculated score, should the API expose which calculation method was used, or allow developers to request a specific method (e.g., `{ smoothnessMethod: 'rms' }`)?

## Checkerboard Area Aggregation Method

**Question:** Should the API provide a `checkerboardAreaMax` metric (peak area), or also include a time-weighted average checkerboard area metric?

**Context:**
The API currently includes `checkerboardTime` to measure the total duration of checkerboarding. However, it doesn't capture the *severity* of checkerboarding — what percentage of the viewport was affected. Checkerboarding severity can vary frame-by-frame during a scroll interaction. Different aggregation methods capture different aspects of the user experience.

**Option A: No area metric (current approach)**
Only expose `checkerboardTime` without any area percentage metric.

**Pros:**
- Simpler API surface
- Duration alone may be sufficient for detecting checkerboarding issues
- Avoids complexity of area calculation and aggregation

**Cons:**
- Loses information about severity: 10% checkerboarding vs 90% checkerboarding are very different user experiences
- Can't threshold on severity level ("alert if >50% of viewport is checkerboarded")
- Less diagnostic value

**Option B: Add `checkerboardAreaMax` (Peak/Maximum)**

Reports the worst-case moment during the scroll:

**Pros:**
- Simple to understand: "at worst, X% was checkerboarded"
- Highlights severe issues even if brief
- Easy to implement: just track maximum value
- Clear threshold-based alerting: "if > 50%, investigate"

**Cons:**
- Doesn't capture how typical the problem was
- A single bad frame gets same weight as sustained checkerboarding
- No information about duration at each severity level

**Option C: Add `checkerboardAreaAvg` (Time-weighted average)**

Calculate average area weighted by frame duration: `Σ(area_i × duration_i) / checkerboardTime`

**Pros:**
- More accurate representation of overall experience
- Accounts for variable frame durations
- Better for RUM analytics and aggregation
- Pairs naturally with `checkerboardTime`: "96ms of checkerboarding averaging 27.5% severity"

**Cons:**
- More complex to calculate
- Less intuitive than peak value
- May undervalue brief but severe checkerboarding

**Option D: Provide both area metrics**

Include both `checkerboardAreaMax` and `checkerboardAreaAvg` to capture both perspectives.

**Pros:**
- Most complete data for analysis
- Supports both severity alerting (max) and quality scoring (avg)

**Cons:**
- Larger API surface
- May cause confusion about which to use

**Example scenario:**
During a scroll with checkerboarding:
- Frame 6 (16ms): 15% checkerboarded
- Frame 7 (16ms): 40% checkerboarded
- Frame 8 (16ms): 60% checkerboarded
- Frame 9 (32ms): 25% checkerboarded (longer frame)
- Frame 10 (16ms): 10% checkerboarded

- `checkerboardAreaMax`: **60%** (worst moment)
- Time-weighted average: **(15×16 + 40×16 + 60×16 + 25×32 + 10×16) / 96 = 27.5%** (typical severity)

**Recommendation needed:**
Should the API add a checkerboard area metric? If so, which aggregation method should be used: peak only (`checkerboardAreaMax`), average only (`checkerboardAreaAvg`), both, or neither?

## Scrollbar as a Distinct Scroll Source

**Question:** Should `"scrollbar"` be added as a distinct `scrollSource` value?

**Context:**
Users can initiate scrolling by directly dragging the scrollbar with a mouse. This is a distinct interaction pattern from wheel scrolling, touch gestures, or keyboard navigation.

**Current approach:**
The API specifies `"touch"`, `"wheel"`, `"keyboard"`, `"other"`, and `"programmatic"` as scroll sources. Scrollbar drags would fall under `"other"`.

**Arguments for adding `"scrollbar"`:**
- Scrollbar drags have different UX characteristics (continuous drag vs discrete steps)
- Useful for understanding user interaction patterns
- Could help diagnose scrollbar-specific performance issues

**Arguments against:**
- **Privacy concern**: No existing web API exposes whether a user is interacting with the scrollbar. Adding this could enable new fingerprinting or behavioral tracking capabilities
- Increases API surface complexity
- May not provide sufficient diagnostic value to justify the addition

**Recommendation needed:** Should scrollbar interactions be distinguished from `"other"`, considering both diagnostic utility and privacy implications?

## References

- [Chrome Graphics Metrics Definitions](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/speed/graphics_metrics_definitions.md)
- [Towards an Animation Smoothness Metric (web.dev)](https://web.dev/articles/smoothness)
- [Chrome Rendering Benchmarks](https://www.chromium.org/developers/design-documents/rendering-benchmarks/)
