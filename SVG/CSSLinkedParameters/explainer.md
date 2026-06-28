# CSS Linked Parameters

**Written:** 2026-06-19

## Authors

- Divyansh Mangal (dmangal@microsoft.com)

## Status of this Document

This document is an **explainer** for an implementation of an existing consensus standard ([CSS Linked Parameters Module Level 1](https://drafts.csswg.org/css-link-params/)). This explainer captures developer benefit, key implementation decisions, and Chromium-specific implementation details.

## Participate

- [Chromium bug 41482962](https://issues.chromium.org/issues/41482962) (implementation tracking)
- [CSS Linked Parameters Module Level 1](https://drafts.csswg.org/css-link-params/) (specification)
- [w3c/csswg-drafts#9872](https://github.com/w3c/csswg-drafts/issues/9872) (original CSSWG discussion)

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

---

## Introduction

CSS Linked Parameters allow passing named CSS values into external resources such as SVG images, where they become accessible as [custom environment variables](https://drafts.csswg.org/css-env/#environment) via `env()`. Values can be set through the `link-parameters` CSS property, through `param()` fragment identifiers in URLs, or through `param()` modifiers in the CSS `url()` function. This enables developers to create reusable, templated SVG images that adapt to a site's theme colors, sizes, or other design tokens, without duplicating files, inlining SVG, or relying on JavaScript.

---

## User-Facing Problem

SVG images are widely used for icons, illustrations, and UI elements. When SVG is inlined in HTML, it can be styled with CSS, for example, changing `fill` on hover. However, when SVG is referenced externally (via `<img>`, `background-image`, `list-style-image`, etc.), CSS inheritance and selectors from the outer page do not apply. The only ways to customize the appearance of an external SVG are:

1. **Duplicate the SVG file** with different hard-coded colors/values for each variant.
2. **Inline the SVG** directly in the HTML, losing caching benefits and increasing document size.
3. **Use JavaScript** to fetch, modify, and inject SVG content dynamically.

None of these approaches scale well:

| Approach | Drawbacks |
|---|---|
| Duplicate SVG files | Maintenance burden; increased network requests; no dynamic changes |
| Inline SVG | No caching across pages; bloated HTML; content not reusable |
| JavaScript injection | Increased complexity; delayed rendering; CSP restrictions |

**Who is affected:** Front-end developers building design systems and icon libraries; teams maintaining multi-brand or themed web applications; any developer using external SVG images that need to adapt to their surrounding context.

**Current workarounds:** Developers commonly use inline SVG with `currentColor`, CSS masks with `background-color`, or complex JavaScript SVG injection libraries (e.g., [svg-inject](https://github.com/niclasvaneyk/svg-inject), [SVGInjector](https://github.com/iconic/SVGInjector)). All trade off caching, complexity, or performance. Some resort to applying chains of CSS filters to approximate color changes, a hacky and imprecise technique.

**Developer demand:** In the [State of CSS 2025](https://2025.stateofcss.com/en-US/features/) survey, 84 respondents entered freeform answers about SVG pain points. A large proportion are complaints such as:

> "Cannot use currentColor in svg image, only inline svg"

> "Not being able to (easily) change the stroke-/fill-color of an SVG background-image"

> "Ability to use currentColor and css variables for SVG set using background-image"

On Stack Overflow, variations of "How to change SVG color on hover" are perennial — [first asked over a decade ago](https://stackoverflow.com/questions/22252472/how-can-i-change-the-color-of-an-svg-element) (3.5 million views, 50+ answers) and [still regularly re-asked](https://stackoverflow.com/questions/24933430/img-src-svg-changing-the-styles-with-css). CSS author Roma Komarov has also documented [existing workarounds and their limitations](https://kizu.dev/svg-linked-parameters-workaround/).

---

## Goals

1. **Enable parameterized external SVG images** — allow developers to pass named values into external SVG resources that can be read via `env()` in the SVG's own stylesheets.
2. **Supported everywhere SVG files are embedded** — work with `<img>`, `background-image`, `list-style-image`, and other contexts that load external SVG as an image resource
3. **Interop** — implement according to the [CSS Linked Parameters Module Level 1](https://drafts.csswg.org/css-link-params/) specification to ensure cross-browser compatibility as other engines adopt the spec.
4. **Graceful degradation** — SVG images that use [`env()`](https://caniuse.com/css-env-function) with fallback values continue to render correctly in browsers that do not support link parameters.

## Non-Goals

- **Cross-origin parameter passing** — link parameters are subject to the same security restrictions as other cross-origin resource interactions.

---

## Proposed Approach

### 1. The `link-parameters` CSS property

A new CSS property, `link-parameters`, sets named parameters on an element. These parameters apply to the element itself (if it represents an external resource, like `<img>`) and to all external CSS resources referenced on that element (like `background-image`).

```css
/* Set a single parameter */
img {
  link-parameters: param(--color, blue);
}

/* Set multiple parameters */
img {
  link-parameters: param(--color, blue), param(--size, 24px);
}

/* Reset to no parameters */
img {
  link-parameters: none;
}
```

**Property definition:**

| Property | Value |
|---|---|
| Name | `link-parameters` |
| Value | `none \| <param()>#` |
| Initial value | `none` |
| Applies to | all elements |
| Inherited | no |
| Animation type | discrete |

Where `<param()>` is defined as:

```
<param()> = param( <dashed-ident>, <declaration-value>? )
```

Per [CSSWG resolution](https://github.com/w3c/csswg-drafts/issues/13767), the comma after `<dashed-ident>` is mandatory. `param(--foo)` without a comma is a parse error.

### 2. URL fragment parameters

Parameters can also be passed through URL fragments:

```html
<img src="icon.svg#param(--color,green)">

<!-- Multiple parameters separated by & -->
<img src="icon.svg#param(--color,green)&param(--size,24px)">
```

### 3. `url()` function modifier

The `param()` function can be used as a `<url-modifier>` inside `url()`:

```css
.icon {
  background-image: url("icon.svg", param(--color, green));
}
```

### How the SVG consumes parameters

In the linked SVG resource, parameters are exposed as [custom environment variables](https://drafts.csswg.org/css-env/#environment), accessible via `env()`:

```svg
<svg xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40"
    fill="env(--color, black)" />
</svg>
```

The `env()` function's second argument provides a fallback value used when no parameter is passed, ensuring the SVG remains usable standalone.

### Merging order

When parameters are specified via multiple mechanisms, they are merged in this order (last wins for duplicate names):

1. `link-parameters` CSS property
2. URL fragment `param()` identifiers
3. `url()` function `param()` modifiers

### Before and after

```html
<!-- BEFORE: duplicate SVG files for each color variant -->
<img src="icon-blue.svg">
<img src="icon-red.svg">
<img src="icon-green.svg">
```

```html
<!-- AFTER: single SVG, parameterized -->
<img src="icon.svg" style="link-parameters: param(--color, blue)">
<img src="icon.svg" style="link-parameters: param(--color, red)">
<img src="icon.svg" style="link-parameters: param(--color, green)">
```

```svg
<!-- icon.svg -->
<svg xmlns="http://www.w3.org/2000/svg">
  <path fill="env(--color, black)" d="..."/>
</svg>
```

---

## Key Design Decisions

1. **`env()` rather than `var()` for consumption.** Link parameters are exposed as custom *environment* variables, not custom *properties*. This is intentional: `env()` is globally scoped and does not participate in the cascade, making it appropriate for externally-injected values. Custom properties (`var()`) are part of the cascade and could conflict with the SVG's own stylesheet.

2. **Comma is mandatory in `param()`.** Per [CSSWG resolution on issue #13767](https://github.com/w3c/csswg-drafts/issues/13767), `param(--foo)` (without a comma) is a parse error. Both `param(--foo, )` (empty value) and `param(--foo, red)` are valid. This avoids ambiguity and aligns with `var()` parsing behavior.

3. **`link-parameters` applies to all external resources on the element.** This means a single `link-parameters` declaration on an element affects its `<img>` source, `background-image`, `list-style-image`, and any other CSS-referenced external resources. This keeps the API simple, developers don't need per-resource parameter overrides for the common case.

4. **Phased implementation.** Our Chromium implementation is split into phases (see the [Chromium design document](https://docs.google.com/document/d/1Dn0v19ljsQD8EKSxsAj2JhoG7DbK_Y3kZc7z8Fu36jg) for full details):
   - **Phase 1 (current):** The `link-parameters` CSS property — parsing, computed style, and SVG image pipeline wiring via `env()` variables.
   - **Phase 2:** URL fragment `param()` parsing and application.
   - **Phase 3:** `url()` function `param()` modifier support.

---

## Alternatives Considered

1. **Extending CSS custom properties to cross document boundaries.** Rejected because custom properties are cascade-scoped; leaking them across security boundaries would violate the isolation model of external resources.

2. **SVG `<use>` with external references.** `<use>` allows some reuse but has significant limitations: it clones DOM subtrees rather than documents, doesn't support full CSS isolation, and has inconsistent cross-browser behavior for external references.

3. **CSS `currentColor` inheritance.** Only works for a single color value, and only when the SVG uses `currentColor`, too limited for multi-parameter theming.

---

## Accessibility, Internationalization, Privacy, and Security Considerations

- **Accessibility:** No negative impact. Link parameters do not introduce new interactive elements or change document semantics. They indirectly benefit accessibility by making it easier to maintain consistent, well-themed SVG images across a site without resorting to complex JavaScript.

- **Internationalization:** No impact. Parameter names are `<dashed-ident>` tokens (ASCII); parameter values are arbitrary CSS values. No text direction, locale, or language concerns.

- **Privacy:** No new concerns. Link parameters are visible only within the rendering pipeline of the linked resource. They do not create new network requests, do not expose information to third parties, and do not expand the fingerprinting surface. The values passed are controlled entirely by the page author.

- **Security:** Link parameters are subject to the same-origin restrictions that apply to external resource rendering. Parameters are consumed only as CSS environment variables within the linked document, they cannot execute script, modify DOM, or access the embedding document's state. The `env()` function already exists in CSS and introduces no new execution capabilities.

---

## Stakeholder Feedback / Opposition

| Stakeholder | Signal | Evidence |
|---|---|---|
| **CSSWG** | ✅ Positive | [First Public Working Draft](https://drafts.csswg.org/css-link-params/) published; active spec discussions |
| **Firefox** | ✅ Positive | Experimental implementation landed ([bug 2022783](https://bugzilla.mozilla.org/show_bug.cgi?id=2022783)) |
| **Safari/WebKit** | No signal | No known implementation or public position (TODO: file standards position request) |
| **Web developers** | ✅ Positive | Long-standing demand for parameterized external SVG; [Stack Overflow (3.5M views)](https://stackoverflow.com/questions/22252472/how-can-i-change-the-color-of-an-svg-element), [State of CSS 2025 survey](https://2025.stateofcss.com/en-US/features/), [Roma Komarov's workaround analysis](https://kizu.dev/svg-linked-parameters-workaround/) |

---

## References & Acknowledgements

**Specs:** [CSS Linked Parameters Module Level 1](https://drafts.csswg.org/css-link-params/) · [CSS Environment Variables Module Level 1](https://drafts.csswg.org/css-env/#environment) · [CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/)

**Bugs:** [Chromium 41482962](https://issues.chromium.org/issues/41482962)

**Discussions:** [w3c/csswg-drafts#13767](https://github.com/w3c/csswg-drafts/issues/13767) (comma requirement resolution)

**Design doc:** [CSS Link Parameters — Chromium Design Document](https://docs.google.com/document/d/1Dn0v19ljsQD8EKSxsAj2JhoG7DbK_Y3kZc7z8Fu36jg)

**Acknowledgements:** Tab Atkins Jr. (spec author), Rune Lillesveen (Chromium CSS OWNERS, implementation review), Fredrik Söderquist (Chromium SVG OWNERS, implementation review).
