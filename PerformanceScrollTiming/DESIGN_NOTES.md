# Design Notes

Scroll performance encompasses several measurable aspects that together determine the quality of the scrolling experience:

- **Responsiveness**: How quickly the page responds when a user initiates a scroll gesture
- **Smoothness**: Whether frames are rendered consistently at the target frame rate during scrolling
- **Visual Completeness**: Whether content is fully painted when it scrolls into view
- **Stability**: Whether the scroll position remains predictable without unexpected jumps
- **Velocity**: How fast the user is scrolling, which helps contextualize performance metrics

## Scroll Start Time
Scroll start time measures the latency between the user's scroll input and the first visual update on screen.

**Key metrics:**
- **Input timestamp**: When the scroll gesture was detected (touch, wheel, or keyboard event)
- **First frame timestamp**: When the first frame reflecting the scroll was presented
- **Scroll start latency**: The delta between input and first frame presentation

In this proposal:
- `entry.startTime` is the **input timestamp** (the first input in the scroll sequence).
- `entry.firstFrameTime` is the **first frame timestamp**.
- `scrollStartLatency` can be derived as `entry.firstFrameTime - entry.startTime`.

**Why it matters:**
High scroll start latency makes the page feel unresponsive. Users expect immediate visual feedback when they initiate a scroll gesture. Latency greater than 100ms is generally perceptible and negatively impacts user experience.

**Common causes of high scroll start latency:**
- Long-running JavaScript blocking the main thread
- Expensive style recalculations or layout operations
- Compositor thread contention
- Touch event handlers without `{ passive: true }`

## Scroll End Time
Scroll end time captures when a scroll interaction completes and the viewport settles at its final position.

**Key metrics:**
- **Last input timestamp**: The final scroll input event in a scroll sequence
- **Settle timestamp**: When momentum/inertia scrolling completes and the viewport is stable
- **Total scroll duration**: Time from scroll start until scrolling stops (includes momentum/inertia)

**Why it matters:**
Understanding scroll end time is essential for:
- Measuring total scroll interaction duration
- Triggering deferred work (lazy loading, analytics) at the right moment
- Calculating overall scroll responsiveness metrics

**Considerations:**
- Momentum scrolling on touch devices extends scroll duration beyond the last touch input
- Programmatic smooth scrolling has predictable end times
- Scroll snapping may adjust the final position after user input ends

## Scroll Smoothness
Scroll smoothness measures how consistently frames are rendered during a scroll animation, reflecting visual fluidity.

**Key metrics:**
- **Frames expected**: Number of frames that should have been rendered at the target refresh rate
- **Frames produced**: Number of frames actually rendered
- **Dropped frame count**: Frames that were skipped or missed their deadline
- **Average frame duration**: Mean time between presented frames
- **Frame duration variance**: Consistency of frame timing (lower is smoother)
- **Smoothness percentage**: `(frames_produced / frames_expected) * 100`

**Why it matters:**
Even if scroll starts quickly, dropped frames during scrolling create visible jank. Users perceive scroll smoothness as a key quality indicator. A smoothness score below 90% is typically noticeable, and below 60% is considered poor.

**Common causes of scroll jank:**
- Expensive paint operations (large areas, complex effects)
- Layout thrashing during scroll event handlers
- Non-composited animations
- Image decoding on the main thread
- Garbage collection pauses

## Scroll Checkerboarding
Scroll checkerboarding occurs when content is not ready to be displayed as it scrolls into the viewport, resulting in blank or placeholder areas.

**Key metric:**
- **Checkerboard time**: Total duration (ms) that unpainted areas were visible during scroll

**Why it matters:**
Checkerboarding breaks the illusion of scrolling through continuous content. It's particularly problematic for:
- Image-heavy pages where images load as they scroll into view
- Infinite scroll implementations
- Complex layouts with off-screen content
- Pages with web fonts that haven't loaded

**Common causes:**
- Slow network preventing timely resource loading
- Insufficient tile/layer rasterization ahead of scroll
- Large images without proper sizing hints
- Lazy loading triggered too late

**Note:** The API currently includes `checkerboardTime` to measure the duration of checkerboarding. A potential future addition is a metric for checkerboard *area* (what percentage of the viewport was affected). See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md#checkerboard-area-aggregation-method) for discussion of area aggregation approaches.

## Scroll Velocity
Scroll velocity measures the speed at which a user navigates through content, calculated as the distance scrolled divided by the duration of the scroll interaction.

**Key metrics:**
- **Scroll distance components**: Horizontal and vertical scroll deltas (`entry.deltaX`, `entry.deltaY`)
- **Total scroll distance**: Euclidean distance combining both axes: `√(deltaX² + deltaY²)`
- **Scroll duration**: Time from scroll start to scroll end (`entry.duration`)
- **Average velocity**: `totalDistance / duration` (pixels per millisecond, or multiply by 1000 for pixels per second)
- **Directional velocity**: Calculate velocity separately for X and Y axes to understand scroll direction and bias
- **Peak velocity**: Maximum instantaneous scroll speed (requires sampling during interaction)

**Why it matters:**
Understanding scroll velocity is essential for performance optimization because different scroll speeds reveal different performance characteristics. Since PerformanceObserver reports entries asynchronously after scroll completion, velocity data is primarily used for telemetry, diagnostics, and informing optimization decisions rather than real-time adaptation.

1. **Performance Issue Diagnosis**: Jank often correlates with scroll velocity. Telemetry may show that a page performs smoothly at low speeds but exhibits dropped frames at high velocities due to:
   - Insufficient rasterization ahead of the scroll direction
   - Paint operations that can't keep up with scroll speed
   - Layout recalculations triggered by scroll position-dependent logic

   By analyzing velocity alongside smoothness metrics in RUM data, developers can identify velocity thresholds where performance degrades and optimize accordingly.

2. **User Intent Inference**: Scroll velocity provides context for interpreting other performance metrics:
   - High velocity + high smoothness = well-optimized scrolling at scale
   - High velocity + low smoothness = performance bottleneck under stress
   - Low velocity + low smoothness = fundamental rendering issues even for gentle scrolling
   - Very high velocity = user skimming or navigating, may not be engaging deeply with content

   This helps prioritize which performance issues to address based on actual user behavior patterns.

3. **Interaction Quality Scoring**: For metrics aggregation and percentile analysis, weighting by velocity helps identify the most impactful performance issues. A jank during a fast 5000px scroll (user actively navigating) may have different implications than jank during a tiny 50px adjustment. Velocity data allows developers to segment and analyze performance by scroll intensity.

4. **Optimization Strategy Validation**: By collecting velocity-stratified performance data, developers can:
   - Validate whether optimizations improve performance across all velocity ranges
   - Identify if certain architectural decisions (lazy loading strategies, virtualization approaches, paint complexity) work well for typical scroll speeds but fail at extremes
   - Make informed tradeoffs (e.g., "our current implementation handles 95% of scroll velocities smoothly")

5. **Benchmarking and Regression Detection**: Velocity provides a standardized dimension for performance testing. Developers can establish performance baselines across velocity buckets (slow: <1000 px/s, medium: 1000-3000 px/s, fast: >3000 px/s) and detect regressions when new code degrades smoothness at specific velocity ranges.

**Common velocity-related patterns:**
- **Fling scrolls**: Touch flings on mobile often produce high initial velocity that decays over time (momentum scrolling)
- **Keyboard/wheel scrolls**: Usually lower, more consistent velocity with discrete steps
- **Scrollbar scrolls**: Dragging the scrollbar thumb can jump through large distances quickly and tends to produce the most checkerboarding, according to Chromium metrics
- **Programmatic scrolls**: Smooth scroll behavior produces predictable, constant velocity
- **Search navigation**: Users jumping to search results often produce short-duration, high-velocity scrolls

## Scroll Interruption and Cancellation

Scroll interactions can be interrupted or cancelled mid-stream. This section defines how `PerformanceScrollTiming` entries behave in these scenarios.

**Scenarios:**

1. **Touch lift during momentum**: User initiates a touch fling, then lifts finger. Momentum scrolling continues until friction stops it or the user touches again.
   - The entry covers the entire interaction including momentum phase
   - `duration` extends until scrolling stops (not when the finger lifts)

2. **Programmatic interruption**: A `scrollTo()` or `scrollIntoView()` call interrupts an ongoing user scroll.
   - The user-initiated scroll entry ends at the interruption point
   - A separate entry with `scrollSource: "programmatic"` may be emitted for the programmatic scroll

3. **Input source switch**: User starts scrolling with touch, then uses mouse wheel mid-scroll.
   - The original entry ends when the new input source is detected
   - A new entry begins for the new input source
   - `scrollSource` reflects the initiating input for each entry

4. **Scroll snap adjustment**: After user input ends, CSS scroll snapping moves the viewport to a snap point.
   - Snap adjustment is considered part of the same scroll interaction
   - `duration` includes the snap animation time

5. **Boundary collision**: Scroll reaches container bounds and cannot continue.
   - Entry ends naturally when scrolling stops at the boundary
   - Overscroll/bounce effects (on supported platforms) are included in `duration`

**Entry emission timing:**
Entries are emitted after the scroll interaction fully completes (including momentum, snap, and settle phases). Interrupted scrolls emit entries at the interruption point with metrics reflecting the partial interaction.

## Edge Cases

This section documents expected behavior for boundary conditions and unusual scenarios.

**Very short scrolls (`framesExpected` = 0):**
- If a scroll interaction completes within a single frame, `framesExpected` may be 0 or 1
- Implementations should avoid division-by-zero when calculating smoothness: treat `framesExpected = 0` as 100% smooth
- Short scrolls are still valid entries and should be emitted

**Zero scroll distance:**
- User attempts to scroll at a boundary (already at top/bottom)
- `deltaX` and `deltaY` are both 0
- Entry is still emitted (the interaction occurred, even if no visual change resulted)
- Useful for detecting "frustrated scrolling" at boundaries

**Overscroll and bounce effects:**
- On platforms with overscroll (iOS rubber-banding, Android overscroll glow):
   - `deltaX`/`deltaY` reflect the actual scroll position change, not the visual overscroll
  - `duration` includes the bounce-back animation time
  - Overscroll does not count as checkerboarding

**Scroll-linked animations:**
- If the page uses `scroll-timeline` or JavaScript scroll-linked animations:
  - Performance of those animations is not directly captured by this API
  - Frame metrics reflect the scroll's visual update, not dependent animations
  - Consider using separate performance instrumentation for scroll-linked effects

**Rapid repeated scrolls:**
- Quick successive scroll gestures (e.g., rapid wheel clicks) may:
  - Merge into a single entry if within the scroll-end detection window
  - Emit separate entries if separated by sufficient idle time
- Implementation defines the debounce/merge behavior

**Disabled scrolling:**
- If `overflow: hidden` prevents scrolling, no entry is emitted (no scroll occurred)
- If JavaScript prevents default on scroll events, behavior is implementation-defined
