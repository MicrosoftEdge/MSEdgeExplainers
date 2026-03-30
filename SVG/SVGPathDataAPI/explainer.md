# SVG Path Data API

**Written:** 2026-03-30, **Updated:** 2026-03-30

## Authors

- Virali Purbey (viralipurbey@microsoft.com)

## Status of this Document

This document is an **in-progress** explainer.

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
- [User Research](#user-research)
- [Proposed Approach](#proposed-approach)
- [Key Design Decisions](#key-design-decisions)
- [Alternatives Considered](#alternatives-considered)
- [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & Acknowledgements](#references--acknowledgements)
- [Appendix: WebIDL](#appendix-webidl)

---

## Introduction

Chrome has had **no native way** to read or write individual SVG path segments since 2015. This explainer proposes adding `getPathData()`, `setPathData()`, and `getPathSegmentAtLength()` to `SVGPathElement`, giving developers structured access to path segments as simple `{type, values}` objects.

The API is specified in the [SVG Paths](https://svgwg.org/specs/paths/#DOMInterfaces) W3C Editor's Draft and has shipped in **Firefox 137+** (Jan 2025). This implements an existing consensus standard - no new web platform concepts are introduced.

---

## User-Facing Problem

SVG `<path>` elements define their shape through a `d` attribute string. Today in Chrome, the only way to inspect or modify individual path segments is to parse this raw string manually or include a polyfill. This can result in slower interactions, larger page loads, and degraded UX - especially on low-end devices.

Chromium removed the old `SVGPathSegList` API in **Chrome 48** (2015) because it was overly complex and poorly specified. The SVG WG specified a cleaner replacement, but it has not yet been implemented in Chrome - a gap that has persisted for over 10 years.

| Engine | Old API (`SVGPathSegList`) | New API (`getPathData`/`setPathData`) |
|--------|---------------------------|---------------------------------------|
| Chrome | ❌ Removed 2015 | ❌ Not yet |
| Firefox | ❌ Removed 2018 | ✅ Shipped Jan 2025 |
| Safari | ✅ Still supported | ❌ Not yet |

**Who is affected:** End users of SVG-heavy web apps (slower load times due to polyfills); data visualization developers (D3.js path morphing); SVG editor developers (Boxy SVG, SVG-Edit); animation developers (path interpolation).

**Current workarounds:** [path-data-polyfill](https://github.com/jarek-foksa/path-data-polyfill) (129+ stars, de facto standard), manual `d` string parsing, and [pathseg polyfill](https://github.com/progers/pathseg). All are slower than native and add unnecessary JS weight.

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

## User Research

No formal study was conducted, but 10 years of organic feedback on [crbug.com/40441025](https://issues.chromium.org/issues/40441025) provides helpful signal: **45 upvotes**, **31 comments** (enterprise developers, library authors), **129+ GitHub stars** on the polyfill, and **5 Sheriffbot closure attempts** survived (2017-2021, each reopened by fs@opera.com).

> *"In our B2B solution for glasses design we have round about 1000 users which can not work since the last Google Chrome update."* - Jan 2016

> *"We'll soon celebrate the 10th anniversary of this issue. It's... a long time."* - Jun 2025

---

## Proposed Approach

**Dependencies on non-stable features:** None.

Three methods are added to `SVGPathElement`, using simple `{type, values}` plain objects:

#### `getPathData(settings)` - read segments

```js
const segments = path.getPathData();
// → [{type: "M", values: [10, 80]}, {type: "C", values: [40, 10, 65, 10, 95, 80]}, ...]

// Normalize: all segments converted to absolute M, L, C, Z
const normalized = path.getPathData({normalize: true});
```

#### `setPathData(pathData)` - write segments (accepts POJOs)

```js
path.setPathData([
  {type: "M", values: [0, 0]},
  {type: "L", values: [100, 0]},
  {type: "L", values: [50, 100]},
  {type: "Z", values: []}
]);
```

#### `getPathSegmentAtLength(distance)` - segment at distance

```js
path.getPathSegmentAtLength(50);
// → {type: "C", values: [40, 10, 65, 10, 95, 80]}
```

All 20 SVG path commands (M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z) are supported. See the [spec](https://svgwg.org/specs/paths/#DOMInterfaces) for the full type/values mapping.

**Normalization** (`{normalize: true}`) converts all segments to absolute **M, L, C, Z** only - relative to absolute, H/V to L, Q/T to C, S to C, A to C. Consumers need only handle 4 command types.

### Before and after

```js
// BEFORE: parse d-string manually or include a polyfill
const d = path.getAttribute('d');
const segments = myCustomParser(d);  // or load ~4KB polyfill
segments[1].values[0] = 50;
path.setAttribute('d', myCustomSerializer(segments));

// AFTER: native, zero dependencies
const segments = path.getPathData();
segments[1].values[0] = 50;
path.setPathData(segments);
```

### Example: path morphing

```js
const segA = pathA.getPathData({normalize: true});
const segB = pathB.getPathData({normalize: true});
const interpolate = (t) => segA.map((s, i) => ({
  type: s.type,
  values: s.values.map((v, j) => v + (segB[i].values[j] - v) * t)
}));
pathTarget.setPathData(interpolate(0.5));
```

The formal WebIDL is in the [Appendix](#appendix-webidl).

---

## Key Design Decisions

1. **Plain objects, not class instances.** We use a WebIDL `dictionary`, so `setPathData()` accepts plain `{type, values}` POJOs natively. Firefox initially required interface instances (Firefox 137), which caused polyfill compatibility issues, and later [updated](https://bugzilla.mozilla.org/show_bug.cgi?id=1954044) to accept plain objects in Firefox 138. Using a dictionary from the start avoids this.

2. **`unrestricted float` for values.** NaN/Infinity are accepted without throwing, matching SVG's graceful error model and Firefox's behavior.

3. **Invalid segments silently skipped.** Unrecognized types or wrong value counts in `setPathData()` are skipped (not thrown), matching SVG's "render what you can" model, Firefox, and the polyfill.

4. **Returns base value, not animated value.** `getPathData()` returns the `d` attribute's base value, consistent with `getAttribute('d')` and Firefox.

---

## Alternatives Considered

| Alternative | Why rejected |
|---|---|
| **Re-implement `SVGPathSegList`** | SVG WG removed it from SVG 2; live mutation is complex; 20+ factory methods; no modern engine adding new support ([WebKit removal bug](https://bugs.webkit.org/show_bug.cgi?id=260894)) |
| **Use `interface` per spec text** | Would not accept plain objects from polyfill code; Firefox encountered this and updated to accept POJOs; spec author confirmed dictionary was the intent |
| **Use `float` (not `unrestricted`)** | SVG renders degenerate paths as empty rather than erroring; would affect polyfill-based code; Firefox uses unrestricted |
| **Throw on invalid segments** | Firefox and polyfill skip silently; SVG model is "render what you can" |
| **Return animated value** | No use case identified; adds complexity; inconsistent with `getAttribute('d')`; Firefox returns base |

---

## Accessibility, Internationalization, Privacy, and Security Considerations

- **Accessibility:** No impact. Programmatic API only - no new visual content, interaction patterns, or ARIA roles. Indirectly benefits a11y by making it easier to build well-structured SVG.
- **Internationalization:** No impact. Path data uses single-character Latin commands and numbers only.
- **Privacy:** No new concerns. Returns the same data available via `getAttribute('d')` - purely a convenience API over existing capabilities. No fingerprinting surface, no network requests.
- **Security:** No new concerns. Operates entirely within the renderer, no IPC, no untrusted data. `setPathData()` goes through the existing hardened `setAttribute("d")` code path. Gated behind a feature flag.

---

## Stakeholder Feedback / Opposition

| Stakeholder | Signal | Evidence |
|---|---|---|
| **Firefox** | ✅ Positive | Shipped [Firefox 137](https://bugzilla.mozilla.org/show_bug.cgi?id=1934525) (Jan 2025); [POJO fix](https://bugzilla.mozilla.org/show_bug.cgi?id=1954044) in 138 |
| **Safari/WebKit** | No signal | Still ships old API; [removal bug](https://bugs.webkit.org/show_bug.cgi?id=260894) open |
| **Web developers** | ✅ Strongly positive | 45 upvotes, 31 comments, enterprise breakage reports, 129+ polyfill stars |
| **SVG WG** | ✅ Positive | API in [consensus spec](https://svgwg.org/specs/paths/#DOMInterfaces) |
| **fs@opera.com** | ✅ Positive | Filed original bug; confirmed dictionary approach |

---

## References & Acknowledgements

**Specs:** [SVG Paths](https://svgwg.org/specs/paths/) · [SVG Paths §7 DOM Interfaces](https://svgwg.org/specs/paths/#DOMInterfaces) · [SVG 2](https://svgwg.org/svg2-draft/)

**Bugs:** [Chromium 40441025](https://issues.chromium.org/issues/40441025) · [Firefox 1934525](https://bugzilla.mozilla.org/show_bug.cgi?id=1934525) · [Firefox 1954044](https://bugzilla.mozilla.org/show_bug.cgi?id=1954044) · [WebKit 260894](https://bugs.webkit.org/show_bug.cgi?id=260894)

**Discussions:** [w3c/editing#483](https://github.com/w3c/editing/issues/483) · [w3c/svgwg#974](https://github.com/w3c/svgwg/issues/974)

**Prior art:** [path-data-polyfill](https://github.com/jarek-foksa/path-data-polyfill) (129+ stars) · [pathseg polyfill](https://github.com/progers/pathseg) · [Interop hotlist](https://issues.chromium.org/hotlists/5575920)

**Acknowledgements:** Fredrik Söderquist (fs@opera.com, original API sketch author, SVG OWNERS), Philip Rogers (pdr@chromium.org, drove SVGPathSegList removal, pathseg polyfill), Robert Longson (Mozilla SVG lead, Firefox implementation), Jarek Foksa (path-data-polyfill author), Cameron McCormack (spec editor).

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

**Spec text updates (PR pending):** `dictionary` instead of `[NoInterfaceObject] interface` (accepts POJOs natively); `unrestricted float` instead of `float` (matches SVG error model); `required` keywords added (prevents `setPathData([{}])`).
