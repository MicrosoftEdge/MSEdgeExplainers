# CSS Linked Parameters for External SVGs

## Authors

- Divyansh Mangal (dmangal@microsoft.com)
- Rahul Singh (rahsin@microsoft.com)

## Status of this Document

The CSS Linked Parameters Module Level 1 has been published as a [W3C Working Draft](https://www.w3.org/TR/css-link-params/). This explainer describes the developer benefits and key design decisions for applying CSS Linked Parameters to external SVGs.

## Participate

- [Chromium bug 41482962](https://issues.chromium.org/issues/41482962) (implementation tracking)
- [w3c/csswg-drafts#9872](https://github.com/w3c/csswg-drafts/issues/9872) (original CSSWG discussion)
- [File a new spec issue](https://github.com/w3c/csswg-drafts/issues/new?title=%5Bcss-link-params%5D)
- [File an Edge explainer issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?labels=CSS+Linked+Parameters)

---

## Introduction

CSS Linked Parameters provides a way for developers to pass CSS values for named parameters into linked resources. This explainer focuses on applying CSS Linked Parameters to external SVGs. Parameters can be supplied through the `link-parameters` property, link parameter directives in URLs, or `param()` modifiers in `url()`. Developers specify each parameter using `param(<dashed-ident>, <declaration-value>?)`, and the external SVG accesses it as a [custom environment variable](https://drafts.csswg.org/css-env/#environment) through `env()`. This allows authors to reuse the same external SVG file with different theme colors or design tokens, without inlining it or maintaining duplicate variants.

---

## User-Facing Problem

SVGs are widely used for icons, illustrations, and UI elements. Inline SVGs can be styled by CSS in the same document, but external SVGs generally cannot be styled directly by CSS in the page that references them. This makes it difficult to adapt a reusable external SVG to different themes or design contexts.

This limitation particularly affects developers building design systems and icon libraries, and teams maintaining multi-brand or themed web applications. They commonly rely on workarounds, each with drawbacks:

| Workaround | Drawbacks |
|---|---|
| Maintain separate SVG files for each variant | Duplicates assets and cache entries, increases maintenance, and requires changing the referenced URL to switch variants |
| Inline the SVG and style it with mechanisms such as `currentColor` | Increases HTML size and prevents the SVG from being independently cached and reused across pages |
| Fetch, modify, and inject SVG with JavaScript using libraries such as [SVGInject](https://github.com/iconfu/svg-inject) or [SVGInjector](https://github.com/iconic/SVGInjector) | Adds script complexity, can delay rendering, and may be restricted by Content Security Policy |

### Evidence of developer demand

In the [State of CSS 2025](https://2025.stateofcss.com/en-US/features/) survey, 84 respondents provided freeform answers about SVG pain points. Styling and coloring external SVGs was the most common theme. Examples included:

> "Cannot use currentColor in svg image, only inline svg"

> "Not being able to (easily) change the stroke-/fill-color of an SVG background-image"

> "Ability to use currentColor and css variables for SVG set using background-image"

Questions about changing SVG colors have attracted substantial attention on Stack Overflow, including [a question from 2014](https://stackoverflow.com/questions/22252472/how-can-i-change-the-color-of-an-svg-element) with more than 3.5 million views and more than 50 answers. Roma Komarov has also documented [existing workarounds and their limitations](https://kizu.dev/svg-linked-parameters-workaround/).

---

## Goals

- **Enable parameterized external SVGs** — allow developers to pass named values into external SVGs, where the values can be read via `env()` in the SVG's own stylesheets.
- **Support external SVG references** — work with external SVGs loaded by an element or referenced through a CSS image property.
- **Interop** — align implementations of CSS Linked Parameters for external SVGs with the [CSS Linked Parameters Module Level 1](https://drafts.csswg.org/css-link-params/) specification to support interoperability across browser engines.
- **Graceful degradation** — external SVGs that use [`env()`](https://caniuse.com/css-env-function) with fallback values continue to render correctly in browsers that do not support link parameters.

## Non-Goals

- **Other linked resources** — This explainer focuses on external SVGs. Applying CSS Linked Parameters to other linked resources is outside its scope.

---

## Proposed Approach

### 1. The `link-parameters` CSS property

A new CSS property, `link-parameters`, sets named parameters on an element or pseudo-element. When an element loads an external SVG directly, those parameters apply to that SVG. They also apply to external SVGs referenced by CSS image properties on the element.

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

```html
<!-- Set a parameter on an SVG loaded as a document -->
<iframe
  src="icon.svg"
  style="link-parameters: param(--color, blue)">
</iframe>
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

Parameters can also be passed directly in an external SVG URL using a [link parameter directive](https://drafts.csswg.org/css-link-params/#url-frag):

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

In the external SVG, parameters are exposed as custom environment variables accessible through `env()`:

```svg
<svg xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40"
    fill="env(--color, black)" />
</svg>
```

The `env()` function's second argument provides a fallback value when no parameter is supplied.

### Merging order

When link parameters are specified through more than one mechanism, they are appended to a single list for the external SVG in this order:

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

1. **`env()` rather than `var()` for consumption.** Link parameters are exposed as custom environment variables and consumed by the external SVG through `env()`. These variables are globally scoped within that SVG and do not participate in the cascade, while custom properties consumed through `var()` do. Using environment variables therefore avoids defining how values from the referencing page would interact with the SVG's own cascade.

2. **The same property applies to external SVGs referenced in different ways.** The `link-parameters` property works when an element loads an external SVG directly and when CSS image properties on that element reference external SVGs. Authors do not need separate APIs for these cases.

---

## Alternatives Considered

1. **Extending CSS custom properties into external SVGs.** This would require defining how custom properties from the referencing page participate in the external SVG's cascade and inheritance.

2. **SVG `<use>` with external references.** An external `<use>` reference renders the referenced content in a [use-element shadow tree](https://www.w3.org/TR/SVG2/struct.html#UseShadowTree). The content can inherit styles from the host `<use>` element, but selectors in the embedding document cannot target elements in that shadow tree. This approach requires an inline SVG container and does not address the broader external SVG use cases covered by this explainer.

3. **CSS `currentColor` inheritance.** This would provide a single inherited color value and require the SVG to use `currentColor`, making it insufficient for multi-parameter theming.

---

## Accessibility, Internationalization, Privacy, and Security Considerations

- **Accessibility:** Link parameters introduce no new document semantics or accessibility APIs. As with other CSS values, authors are responsible for ensuring that resulting visual and interaction changes remain accessible.

- **Internationalization:** Link parameters use existing CSS syntax and introduce no new text-direction, locale, or language behavior.

- **Privacy:** Link parameters are supplied by the referencing page and made available to the SVG as environment variables. They are not included in the SVG resource request.

- **Security:** Link parameters introduce a way for a referencing page to supply CSS values to an external SVG. The external SVG opts into each parameter by explicitly using the corresponding `env()` variable. An SVG loaded as an image retains the restrictions that already apply to SVG images, while an SVG loaded as a document retains the security model of that document context. If consuming a parameter triggers a resource load, that load remains subject to the security checks and policies that normally apply to the relevant CSS property and loading context.

---

## Stakeholder Feedback / Opposition

| Stakeholder | Signal | Evidence |
|---|---|---|
| **Firefox** | ✅ Positive | Firefox tracks the full specification in [meta bug 1812163](https://bugzilla.mozilla.org/show_bug.cgi?id=1812163). The `link-parameters` property is enabled for external SVG image rendering in Firefox Nightly starting with Firefox 153 ([implementation bug 2022783](https://bugzilla.mozilla.org/show_bug.cgi?id=2022783), [Nightly enablement bug 2046153](https://bugzilla.mozilla.org/show_bug.cgi?id=2046153)). Mozilla has [identified both URL-based mechanisms as follow-up implementation work](https://bugzilla.mozilla.org/show_bug.cgi?id=1812163#c2), with the `url()` modifier tracked in [bug 1812167](https://bugzilla.mozilla.org/show_bug.cgi?id=1812167). |
| **Safari/WebKit** | No signal | No public position |
| **Web developers** | ✅ Positive | External SVG styling and coloring are recurring developer pain points. See [State of CSS 2025 Shapes & Graphics pain points](https://2025.stateofcss.com/en-US/features/#shapes_graphics_pain_points). |

---

## References & Acknowledgements

**Status:** [ChromeStatus entry](https://chromestatus.com/feature/5095153430822912)

**Specs:** [CSS Linked Parameters Module Level 1](https://drafts.csswg.org/css-link-params/) (Editor's Draft) · [CSS Environment Variables Module Level 1](https://drafts.csswg.org/css-env/#environment) · [CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/)

**Design doc:** [Chromium design document](https://docs.google.com/document/d/1Dn0v19ljsQD8EKSxsAj2JhoG7DbK_Y3kZc7z8Fu36jg)

**Acknowledgements:** Tab Atkins Jr. (spec author), Rune Lillesveen (Chromium CSS OWNERS, implementation review), Fredrik Söderquist (Chromium SVG OWNERS, implementation review).
