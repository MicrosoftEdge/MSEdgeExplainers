# SVG Path Data API

**Written:** 2026-03-30, **Updated:** 2026-04-06

## Authors

- Virali Purbey (viralipurbey@microsoft.com)

## Status of this Document

This document is a **short explainer** for an implementation of an existing consensus standard ([SVG Paths §7 DOM Interfaces](https://svgwg.org/specs/paths/#DOMInterfaces)). No new web platform concepts are introduced. This explainer captures developer benefit, key implementation decisions, and Chromium-specific shipping details; it is intentionally concise since the API was designed by the SVG WG, not the authors of this document.

## Participate

- [Issue #1289](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1289) (explainer feedback)
- [Chromium bug 40441025](https://issues.chromium.org/issues/40441025) (45 upvotes, filed Oct 2015)
- [SVG Paths §7 - DOM Interfaces](https://svgwg.org/specs/paths/#DOMInterfaces) (specification)
- [Firefox bug 1934525](https://bugzilla.mozilla.org/show_bug.cgi?id=1934525) (implementation) · [bug 1954044](https://bugzilla.mozilla.org/show_bug.cgi?id=1954044) (POJO fix)
- [w3c/editing#483](https://github.com/w3c/editing/issues/483) (POJO compat) · [w3c/svgwg#974](https://github.com/w3c/svgwg/issues/974) (constructability)

## Table of Contents

- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Proposed Approach](#proposed-approach)
- [Key Design Decisions](#key-design-decisions)
- [Alternatives Considered](#alternatives-considered)
- [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & Acknowledgements](#references--acknowledgements)
- [Testing](#testing)
- [Implementation Notes](#implementation-notes)
- [Appendix: WebIDL](#appendix-webidl)

---

## Introduction

Chrome has had **no native way** to read or write individual SVG path segments since Chrome 48 (early 2016). This explainer proposes implementing `getPathData()`, `setPathData()`, and `getPathSegmentAtLength()` on `SVGPathElement`, as specified in the [SVG Paths](https://svgwg.org/specs/paths/#DOMInterfaces) W3C Editor's Draft and already shipped in **Firefox 137+** (Apr 2025).

---

## User-Facing Problem

SVG `<path>` elements define their shape through a `d` attribute string. Today in Chrome, the only way to inspect or modify individual path segments is to parse this raw string manually or include a polyfill. This can result in slower interactions, larger page loads, and degraded UX - especially on low-end devices.

Chromium removed the old `SVGPathSegList` API in **Chrome 48** (Jan 2016) because it was overly complex and poorly specified. The SVG WG specified a cleaner replacement, but it has not yet been implemented in Chrome - a gap that has persisted for over 10 years.

| Engine | Old API (`SVGPathSegList`) | New API (`getPathData`/`setPathData`) |
|--------|---------------------------|---------------------------------------|
| Chrome | ❌ Removed Jan 2016 | ❌ Not implemented |
| Firefox | ❌ Removed 2018 | ✅ Shipped Apr 2025 |
| Safari | ✅ Still supported | ❌ Not implemented |

**Who is affected:** End users of SVG-heavy web apps (slower load times due to polyfills); data visualization developers (D3.js path morphing); SVG editor developers (Boxy SVG, SVG-Edit); animation developers (path interpolation).

**Current workarounds:** [path-data-polyfill](https://github.com/jarek-foksa/path-data-polyfill) (129+ stars, de facto standard), manual `d` string parsing, and [pathseg polyfill](https://github.com/progers/pathseg). All are slower than native and add unnecessary JS weight.

**Developer demand:** [crbug.com/40441025](https://issues.chromium.org/issues/40441025) has **45 upvotes** and **31 comments** from enterprise developers and library authors over 10 years. Five Sheriffbot closure attempts (2017-2021) were each reopened.

---

## Goals

1. **Restore segment-level path access** natively in Chrome.
2. **Interop with Firefox** - match Firefox 137+'s shipped behavior.
3. **Polyfill compatibility** - code using path-data-polyfill should work unchanged with the native API.
4. **Normalization support** - `getPathData({normalize: true})` returns only absolute M, L, C, Z.

## Non-Goals

- **Restoring `SVGPathSegList`** - the old API is not being brought back.
- **Path editing UI** - programmatic API only.
- **Animated path data** - returns base value only, not current animated value.
- **New path commands** - no Catmull-Rom (`R`) or Bearing (`B`); no browser supports them.
- **`SVGPathSegment` constructor** - the SVG WG resolved that a constructor is not needed at this time; our dictionary approach aligns with this.

---

## Proposed Approach

Three methods are added to `SVGPathElement`, using simple `{type, values}` plain objects (no dependencies on non-stable features):

#### `getPathData(settings)` - read segments

```js
const segments = path.getPathData();
// → [{type: "M", values: [10, 80]}, {type: "C", values: [40, 10, 65, 10, 95, 80]}, ...]

// Normalize: all segments converted to absolute M, L, C, Z
const normalized = path.getPathData({normalize: true});

// Empty or missing d attribute returns an empty array
emptyPath.getPathData();  // → []
```

#### `setPathData(pathData)` - write segments (accepts POJOs)

```js
path.setPathData([
  {type: "M", values: [0, 0]},
  {type: "L", values: [100, 0]},
  {type: "L", values: [50, 100]},
  {type: "Z", values: []}
]);

// Passing an empty array clears the path: sets d="" (equivalent to setAttribute('d', ''),
// NOT removeAttribute('d') - the attribute remains present but empty). Matches Firefox.
path.setPathData([]);
// getPathData() on an empty/cleared path returns []
emptyPath.getPathData();  // → []
```

#### `getPathSegmentAtLength(distance)` - segment at distance

```js
path.getPathSegmentAtLength(50);
// → {type: "C", values: [40, 10, 65, 10, 95, 80]}

// Returns null if the path is empty or has no length
emptyPath.getPathSegmentAtLength(10);  // → null

// Negative distances clamp to 0 (returns the first segment), matching getPointAtLength() behavior
path.getPathSegmentAtLength(-10);  // → {type: "M", values: [10, 80]}

// NaN returns null
path.getPathSegmentAtLength(NaN);  // → null

// Distances exceeding getTotalLength() clamp to the path's total length (returns last segment),
// matching getPointAtLength() clamping behavior per the SVG spec.
path.getPathSegmentAtLength(99999);  // → last segment (e.g. {type: "Z", values: []})
```

All 20 SVG path commands (M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z) are supported. See the [spec](https://svgwg.org/specs/paths/#DOMInterfaces) for the full type/values mapping.

**Normalization** (`{normalize: true}`) converts all segments to absolute **M, L, C, Z** only - relative to absolute, H/V to L, Q/T to C, S to C, A to C. Consumers need only handle 4 command types.

> **Note:** Arc-to-cubic conversion (A → C) is an approximation (inherently lossy); quadratic-to-cubic (Q → C) is exact. Precision details will be in the design doc.

### Before and after

```js
// BEFORE: parse d-string manually or include a polyfill
const d = path.getAttribute('d');
const segments = myCustomParser(d);  // or load ~4KB polyfill
segments[1].values[0] = 50;
path.setAttribute('d', myCustomSerializer(segments));
```

```js
// AFTER: native, zero dependencies
const segments = path.getPathData();
segments[1].values[0] = 50;
path.setPathData(segments);
```

The formal WebIDL is in the [Appendix](#appendix-webidl).

---

## Key Design Decisions

1. **Plain objects, not class instances.** We use a WebIDL `dictionary`, so `setPathData()` accepts plain `{type, values}` POJOs natively. The SVG WG confirmed this approach in [w3c/svgwg#1082](https://github.com/w3c/svgwg/issues/1082). Firefox initially required interface instances (Firefox 137), which caused polyfill compatibility issues, and later [updated](https://bugzilla.mozilla.org/show_bug.cgi?id=1954044) to accept plain objects in Firefox 138. Using a dictionary from the start avoids this.

2. **`unrestricted float` for values.** NaN/Infinity are accepted without throwing, matching SVG's graceful error model and Firefox's behavior.

3. **Two-level validation in `setPathData()`.** WebIDL enforces structural validity: both `type` and `values` must be present, or a `TypeError` is thrown (e.g., `setPathData([{}])` or `setPathData([{type: "L"}])` throws). Semantic validation is lenient: unrecognized type strings or incorrect `values` array lengths cause the segment to be silently skipped - not thrown - matching SVG's "render what you can" model, Firefox, and the polyfill.

4. **Returns base value, not animated value.** `getPathData()` returns the `d` attribute's base value, consistent with `getAttribute('d')` and Firefox.

---

## Alternatives Considered

The API shape was designed by the SVG WG, not the authors of this document. The main alternative - re-implementing the old `SVGPathSegList` API - was rejected by the WG because of its complexity (20+ factory methods, live mutation semantics). No modern engine is adding new `SVGPathSegList` support ([WebKit removal bug](https://bugs.webkit.org/show_bug.cgi?id=260894)).

Our implementation-specific choices (dictionary vs interface, `unrestricted float`, lenient validation) are documented in [Key Design Decisions](#key-design-decisions) above.

---

## Accessibility, Internationalization, Privacy, and Security Considerations

- **Accessibility:** No impact. Programmatic API only - no new visual content, interaction patterns, or ARIA roles. Indirectly benefits a11y by making it easier to build well-structured SVG.
- **Internationalization:** No impact. Path data uses single-character Latin commands and numbers only.
- **Privacy:** No new concerns. Returns the same data available via `getAttribute('d')` - purely a convenience API over existing capabilities. No fingerprinting surface, no network requests.
- **Security:** No new concerns. Operates entirely within the renderer on already-structured data. `setPathData()` operates on structured `{type, values}` dictionaries - no string parsing is needed (segments are pre-typed), reducing attack surface compared to `setAttribute('d')`. No additional IPC beyond existing DOM access. Gated behind a Blink `RuntimeEnabledFeature` (`SVGPathDataAPI`).

---

## Stakeholder Feedback / Opposition

| Stakeholder | Signal | Evidence |
|---|---|---|
| **Firefox** | ✅ Positive | Shipped [Firefox 137](https://bugzilla.mozilla.org/show_bug.cgi?id=1934525) (Apr 2025); [POJO fix](https://bugzilla.mozilla.org/show_bug.cgi?id=1954044) in 138 |
| **Safari/WebKit** | No signal | Still ships old API; [removal bug](https://bugs.webkit.org/show_bug.cgi?id=260894) open (TODO: file WebKit standards position request) |
| **Web developers** | ✅ Strongly positive | 45 upvotes, 31 comments, enterprise breakage reports, 129+ polyfill stars |
| **SVG WG** | ✅ Positive | API in [consensus spec](https://svgwg.org/specs/paths/#DOMInterfaces); dictionary approach confirmed in [w3c/svgwg#1082](https://github.com/w3c/svgwg/issues/1082) |

---

## References & Acknowledgements

**Specs:** [SVG Paths](https://svgwg.org/specs/paths/) · [SVG Paths §7 DOM Interfaces](https://svgwg.org/specs/paths/#DOMInterfaces) · [SVG 2](https://svgwg.org/svg2-draft/)

**Bugs:** [Chromium 40441025](https://issues.chromium.org/issues/40441025) · [Firefox 1934525](https://bugzilla.mozilla.org/show_bug.cgi?id=1934525) · [Firefox 1954044](https://bugzilla.mozilla.org/show_bug.cgi?id=1954044) · [WebKit 260894](https://bugs.webkit.org/show_bug.cgi?id=260894)

**Discussions:** [w3c/editing#483](https://github.com/w3c/editing/issues/483) · [w3c/svgwg#974](https://github.com/w3c/svgwg/issues/974) · [w3c/svgwg#1082](https://github.com/w3c/svgwg/issues/1082) (dictionary resolution)

**Prior art:** [path-data-polyfill](https://github.com/jarek-foksa/path-data-polyfill) (129+ stars) · [pathseg polyfill](https://github.com/progers/pathseg) · [Interop hotlist](https://issues.chromium.org/hotlists/5575920) (Chromium cross-browser interop tracking; includes [crbug.com/40441025](https://issues.chromium.org/issues/40441025))

**Acknowledgements:** Fredrik Söderquist (fs@opera.com, original API sketch author, SVG OWNERS), Philip Rogers (pdr@chromium.org, drove SVGPathSegList removal, pathseg polyfill), Robert Longson (Mozilla SVG lead, Firefox implementation), Jarek Foksa (path-data-polyfill author), Cameron McCormack (spec editor).

---

## Testing

**Existing WPTs:** Firefox landed web-platform-tests alongside their implementation in [svg/path/interfaces/](https://wpt.fyi/results/svg/path/interfaces?label=experimental&label=master&aligned), including `SVGPathSegment.svg` which covers `getPathData()`, `setPathData()`, `getPathSegmentAtLength()`, normalization, and basic command coverage.

**Planned additional tests:**
- Edge cases: empty paths, NaN/Infinity values, distance > totalLength clamping, negative distance clamping
- Normalization accuracy: arc-to-cubic precision, quadratic-to-cubic exactness
- POJO acceptance: plain `{type, values}` objects work without constructors
- Two-level validation: TypeError for missing required fields vs silent skip for semantic errors
- Blink layout tests for rendering integration

---

## Implementation Notes

**Feature flag:** This API will be gated behind a Blink `RuntimeEnabledFeature` named `SVGPathDataAPI`. It will not have a separate `chrome://flags` entry - it follows the standard Blink shipping process (flag → origin trial → ship).

**UseCounters:** The implementation will include UseCounters for each method (`getPathData`, `setPathData`, `getPathSegmentAtLength`) to track adoption and inform the ship decision. No existing UseCounter data is available since the API does not yet exist in Blink.

---

## Appendix: WebIDL

```webidl
dictionary SVGPathSegment {
  required DOMString type;
  required sequence<unrestricted float> values;
};

dictionary SVGPathDataSettings {
  boolean normalize = false;
};

partial interface SVGPathElement {
  sequence<SVGPathSegment> getPathData(optional SVGPathDataSettings settings = {});
  undefined setPathData(sequence<SVGPathSegment> pathData);
  SVGPathSegment? getPathSegmentAtLength(unrestricted float distance);
};
```

**Spec text updates (spec PR to be filed):** `dictionary` instead of `[NoInterfaceObject] interface` (accepts POJOs natively; WG resolution: [w3c/svgwg#1082](https://github.com/w3c/svgwg/issues/1082)); `unrestricted float` instead of `float` (matches SVG error model); `required` keywords added (prevents `setPathData([{}])`).
