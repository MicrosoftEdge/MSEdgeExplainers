# CSS Linked Parameters Support for External SVG Images

## Authors

- Divyansh Mangal (dmangal@microsoft.com)
- Rahul Singh (rahsin@microsoft.com)

## Status of this Document

The CSS Linked Parameters Module Level 1 has been published as a [W3C Working Draft](https://www.w3.org/TR/css-link-params/). This explainer describes Chromium's phased implementation of the specification for external SVG images, including developer benefits and key implementation decisions.

## Participate

- [Chromium bug 41482962](https://issues.chromium.org/issues/41482962) (implementation tracking)
- [w3c/csswg-drafts#9872](https://github.com/w3c/csswg-drafts/issues/9872) (original CSSWG discussion)
- [File a new spec issue](https://github.com/w3c/csswg-drafts/issues/new?title=%5Bcss-link-params%5D)
- [File an Edge explainer issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?labels=CSS+Linked+Parameters)

---

## Introduction

CSS Linked Parameters provides a way for developers to pass CSS values for named parameters into linked resources. This explainer covers CSS Linked Parameters support for external SVG images loaded through `<img>` or CSS image properties such as `background-image`. Parameters can be supplied through the `link-parameters` property, link parameter directives in URLs, or `param()` modifiers in `url()`. Developers specify each parameter using `param(<dashed-ident>, <declaration-value>?)`, and the linked SVG accesses it as a [custom environment variable](https://drafts.csswg.org/css-env/#environment) through `env()`. This allows a single cacheable SVG file to adapt to different theme colors or design tokens without being inlined or duplicated.

---

## User-Facing Problem

SVG images are widely used for icons, illustrations, and UI elements. Inline SVG can be styled with CSS from the embedding page, but external SVG images loaded through `<img>` or CSS image properties do not inherit styles or match selectors from that page. This makes it difficult to adapt a reusable external SVG image to different themes or design contexts.

This limitation particularly affects developers building design systems and icon libraries, and teams maintaining multi-brand or themed web applications. They commonly rely on workarounds, each with drawbacks:

| Workaround | Drawbacks |
|---|---|
| Maintain separate SVG files for each variant | Duplicates assets and cache entries, increases maintenance, and requires changing the image URL to switch variants |
| Inline the SVG and style it with mechanisms such as `currentColor` | Increases HTML size and prevents the SVG from being cached and reused independently as an image resource |
| Fetch, modify, and inject SVG with JavaScript using libraries such as [svg-inject](https://github.com/niclasvaneyk/svg-inject) or [SVGInjector](https://github.com/iconic/SVGInjector) | Adds script complexity, can delay rendering, and may be restricted by Content Security Policy |

### Evidence of developer demand

In the [State of CSS 2025](https://2025.stateofcss.com/en-US/features/) survey, 84 respondents provided freeform answers about SVG pain points. Styling and coloring external SVGs was the most common theme. Examples included:

> "Cannot use currentColor in svg image, only inline svg"

> "Not being able to (easily) change the stroke-/fill-color of an SVG background-image"

> "Ability to use currentColor and css variables for SVG set using background-image"

Questions about changing SVG colors have attracted substantial attention on Stack Overflow, including [a question from 2014](https://stackoverflow.com/questions/22252472/how-can-i-change-the-color-of-an-svg-element) with more than 3.5 million views and more than 50 answers. Roma Komarov has also documented [existing workarounds and their limitations](https://kizu.dev/svg-linked-parameters-workaround/).

---

## Goals

- **Enable parameterized external SVG images** — allow developers to pass named values into external SVG images that can be read via `env()` in the SVG's own stylesheets.
- **Support external SVG images across image-loading contexts** — work with `<img>` and CSS image properties such as `background-image` and `list-style-image`.
- **Interop** — align Chromium's implementation with the [CSS Linked Parameters Module Level 1](https://drafts.csswg.org/css-link-params/) specification to support interoperability across browser engines.
- **Graceful degradation** — SVG images that use [`env()`](https://caniuse.com/css-env-function) with fallback values continue to render correctly in browsers that do not support link parameters.

## Non-Goals

- **Other linked-resource contexts** — Chromium's implementation is limited to external SVG images. Applying CSS Linked Parameters to documents loaded through `<iframe>` or to other non-image resource contexts is outside scope.

---

## Proposed Approach

### 1. The `link-parameters` CSS property

A new CSS property, `link-parameters`, sets named parameters on an element or pseudo-element. For the Chromium implementation described in this explainer, those parameters are passed to external SVG images represented by the element, such as an `<img>` source, and to external SVG images referenced by CSS image properties, such as `background-image`.

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
| Applies to | all elements and pseudo-elements |
| Inherited | no |
| Animation type | discrete |

Where `<param()>` is defined as:

```
<param()> = param( <dashed-ident>, <declaration-value>? )
```

The value after the comma is optional; if omitted, it represents an empty value, as in `param(--foo,)`.

Per [CSSWG resolution](https://github.com/w3c/csswg-drafts/issues/13767), the comma after `<dashed-ident>` is mandatory. `param(--foo)` without a comma is a parse error.

### 2. Link parameter directives in URLs

Parameters can also be passed directly in an external SVG image URL using a [link parameter directive](https://drafts.csswg.org/css-link-params/#url-frag):

```html
<img src="icon.svg#:~:param(--color,green)">

<!-- Multiple link parameter directives separated by & -->
<img src="icon.svg#:~:param(--color,green)&param(--size,24px)">
```

### 3. `url()` function modifier

The `param()` function can be used as a `<url-modifier>` inside `url()`:

```css
.icon {
  background-image: url("icon.svg" param(--color, green));
}
```

### How the SVG consumes parameters

In the linked SVG resource, parameters are exposed as custom environment variables, accessible via `env()`:

```svg
<svg xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40"
    fill="env(--color, black)" />
</svg>
```

The `env()` function's second argument provides a fallback value when no parameter is passed, such as when the SVG is used standalone.

### Merging order

When link parameters are specified through more than one mechanism, they are appended to a single list for the external SVG image in this order:

1. `link-parameters` CSS property
2. Link parameter directives in the URL
3. `url()` function `param()` modifiers

If multiple link parameters have the same name, the last one in the list is used.

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

1. **`env()` rather than `var()` for consumption.** Link parameters are exposed as custom environment variables in the linked SVG and consumed through `env()`. Environment variables have one value throughout the SVG document and do not participate in the cascade, while custom properties consumed through `var()` do. Using environment variables therefore avoids defining how values from the embedding page would interact with the SVG's own cascade.

2. **A single declaration applies across external SVG image-loading contexts.** On an `<img>`, `link-parameters` applies to its external SVG source. On any element or pseudo-element, it applies to external SVG images loaded by CSS image properties such as `background-image` and `list-style-image`. This keeps the API consistent across the supported image-loading contexts.

3. **Phased implementation.** The Chromium implementation is split into three phases:
   - **Phase 1:** The `link-parameters` CSS property — parsing, computed style, and SVG image pipeline wiring via `env()` variables.
   - **Phase 2:** Parsing and application of link parameter directives in external SVG image URLs.
   - **Phase 3:** `url()` function `param()` modifier support.

   See the [Chromium design document](https://docs.google.com/document/d/1Dn0v19ljsQD8EKSxsAj2JhoG7DbK_Y3kZc7z8Fu36jg) for more details.

---

## Alternatives Considered

1. **Extending CSS custom properties into external SVG image documents.** This would require defining how custom properties from the embedding page participate in the linked SVG document's cascade and inheritance.

2. **SVG `<use>` with external references.** An external `<use>` reference renders the referenced content in a [use-element shadow tree](https://www.w3.org/TR/SVG2/struct.html#UseShadowTree). The content can inherit styles from the host `<use>` element, but selectors in the embedding document cannot target elements in that shadow tree. This approach requires an inline SVG container and does not address external SVG images loaded through `<img>` or CSS image properties.

3. **CSS `currentColor` inheritance.** This would provide a single inherited color value and require the SVG to use `currentColor`, making it insufficient for multi-parameter theming.

---

## Accessibility, Internationalization, Privacy, and Security Considerations

- **Accessibility:** Link parameters affect visual styling but do not add or change document semantics or interaction behavior.

- **Internationalization:** Link parameters use existing CSS syntax and introduce no new text-direction, locale, or language behavior.

- **Privacy:** Link parameters are set by the embedding page and applied locally while rendering the linked SVG. They are not included in the SVG resource request and do not create additional network requests.

- **Security:** Link parameters do not change existing resource-loading or origin checks. External SVG images remain isolated with scripts and plugins disabled, and non-data subresource requests blocked. Parameter values affect only CSS properties where the linked SVG explicitly uses the corresponding `env()` variable.

---

## Stakeholder Feedback / Opposition

| Stakeholder | Signal | Evidence |
|---|---|---|
| **Firefox** | ✅ Positive | The `link-parameters` property is enabled in Firefox Nightly starting with Firefox 153 ([implementation bug 2022783](https://bugzilla.mozilla.org/show_bug.cgi?id=2022783), [Firefox Nightly enablement bug 2046153](https://bugzilla.mozilla.org/show_bug.cgi?id=2046153)) |
| **Safari/WebKit** | No signal | No public position |
| **Web developers** | ✅ Positive | External SVG styling and coloring are recurring developer pain points. See [State of CSS 2025 Shapes & Graphics pain points](https://2025.stateofcss.com/en-US/features/#shapes_graphics_pain_points). |

---

## References & Acknowledgements

**Status:** [ChromeStatus entry](https://chromestatus.com/feature/5095153430822912)

**Specs:** [CSS Linked Parameters Module Level 1](https://drafts.csswg.org/css-link-params/) (Editor's Draft) · [CSS Environment Variables Module Level 1](https://drafts.csswg.org/css-env/#environment) · [CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/)

**Design doc:** [Chromium design document](https://docs.google.com/document/d/1Dn0v19ljsQD8EKSxsAj2JhoG7DbK_Y3kZc7z8Fu36jg)

**Acknowledgements:** Tab Atkins Jr. (spec author), Rune Lillesveen (Chromium CSS OWNERS, implementation review), Fredrik Söderquist (Chromium SVG OWNERS, implementation review).
