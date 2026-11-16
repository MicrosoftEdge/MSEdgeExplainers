# Image Preview: HTML and CSS authoring comparison

This document compares HTML-defined previews with a CSS alternative using the proposal's [exploratory styling parts](explainer.md#exploratory-css-styling). It supports discussion of [MicrosoftEdge/MSEdgeExplainers#1440](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1440).

HTML is often more direct for preview data associated with a particular image, especially art-directed sources and server-rendered markup under a policy prohibiting inline styles. CSS offers cascade-based selection, reuse, and presentation controls. A thumbnail painted with `background-image` can still represent image content; its painting mechanism does not make it decoration. Neither alternative gives the preview separate image semantics or alternative text.

## Status and assumptions

The HTML examples use the proposed `preview` and `previewset` attributes. The CSS examples use `background-image` or `background-color` on the sketch's `::preview` part, not `content` or a new `image-preview-source` property.

**For this comparison, assume `::preview` becomes eligible for display when its background image loads, without requiring an HTML `preview` attribute.** A color-only preview is ready without a fetch; a nontransparent color establishes a ready preview, while the default transparent background does not. Eligibility does not override the main-image handoff: if the selected image is presented first, the preview is skipped.

Assume the browser loads the preview background even while its part is hidden, subject to the same lazy-loading policy as HTML previews. Both alternatives use the core eligibility, failure, cancellation, and native main-image handoff rules. Neither changes layout, selected-image APIs, accessibility, or image-extraction APIs. The browser removes the preview when the main image is presented, including behind transparent pixels.

These are proposed features, not interoperable browser capabilities. The comparison treats the alternatives separately and does not define precedence when both supply previews.

## Use cases

Each use case occupies one table row. Both comparison cells include complete markup and all required CSS, with line breaks inside each cell. Each example is independent.

Dimensions reserve space; `object-fit: cover` is not required. Where an alternative cannot directly express the requested behavior, the cell explicitly says so rather than implying equivalent support.

### Preview data and authoring

| Use case | HTML preview | CSS preview |
| --- | --- | --- |
| **Content-specific thumbnail** | **HTML**<br><br>`<img`<br>`  src="lake.avif"`<br>`  preview='url("lake-thumb.avif")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required.<br><br>Directly associates the thumbnail with the main image. | **HTML**<br><br>`<img`<br>`  class="photo lake"`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br>`.lake::preview {`<br>`  background-image: url("lake-thumb.avif");`<br>`}` |
| **Per-image data in server-rendered markup** | **HTML**<br><br>`<img`<br>`  src="lake.avif"`<br>`  preview='url("lake-thumb.avif")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required.<br><br>No custom-property mapping is needed. | **HTML**<br><br>`<img`<br>`  class="photo"`<br>`  src="lake.avif"`<br>`  style='--image-preview: url("lake-thumb.avif")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-image: var(--image-preview, none);`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br><br>Requires custom-property inheritance to the part and permission for inline styles. |
| **Inline data; no separate network request** | **HTML**<br><br>`<img`<br>`  src="lake.avif"`<br>`  preview='url("data:image/avif;base64,...")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required.<br><br>`...` stands for the encoded thumbnail bytes, not a literal payload. | **HTML**<br><br>`<img`<br>`  class="photo"`<br>`  src="lake.avif"`<br>`  style='--image-preview: url("data:image/avif;base64,...")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-image: var(--image-preview, none);`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br><br>Replace `...` with encoded thumbnail bytes. Both alternatives still require decoding and CSP permission for `data:` images. |
| **Content-derived dominant color** | **HTML**<br><br>`<img`<br>`  src="lake.avif"`<br>`  preview="#68788c"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required.<br><br>Accepts a self-contained color. | **HTML**<br><br>`<img`<br>`  class="lake"`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.lake::preview {`<br>`  background-color: #68788c;`<br>`}`<br><br>Background sizing is unnecessary for a solid color. |
| **Theme-derived or reusable presentation** | **No direct equivalent for cascade-derived values.** This fixed-color example does not follow theme changes:<br><br>**HTML**<br><br>`<img`<br>`  src="lake.avif"`<br>`  preview="#68788c"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required for the fixed value.<br><br>The current HTML value model excludes `var()`, `currentColor`, and gradients. Script can update the attribute. | **HTML**<br><br>`<img`<br>`  class="photo"`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`:root { --preview-color: #68788c; }`<br>`@media (prefers-color-scheme: dark) {`<br>`  :root { --preview-color: #344052; }`<br>`}`<br>`.photo::preview {`<br>`  background-color: var(--preview-color);`<br>`}`<br><br>Can also use gradients and images. Generic waiting decoration belongs on `::image-placeholder`, not necessarily a preview. |
| **Compact representations** | **HTML**<br><br>`<img`<br>`  src="lake.avif"`<br>`  preview='blurhash("LEHV6nWB2yk8pyo0adR*.7kCMdnj")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required.<br><br>Illustrative syntax requiring a separate format specification and preview-value binding. | **No native CSS binding is specified.** The image can still be declared, but has no compact preview:<br><br>**HTML**<br><br>`<img`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>No equivalent declaration until a CSS image-function or image-format binding is specified.<br><br>Author-script decoding to a data URL is a different approach. |

### Responsive images and art direction

Main-image selection remains in HTML for both alternatives.

| Use case | HTML preview | CSS preview |
| --- | --- | --- |
| **Multiple main-image resolutions; one preview** | **HTML**<br><br>`<img`<br>`  src="lake-1200.avif"`<br>`  srcset="lake-600.avif 600w, lake-1200.avif 1200w"`<br>`  sizes="(width < 800px) 100vw, 800px"`<br>`  preview='url("lake-thumb.avif")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required. | **HTML**<br><br>`<img`<br>`  class="photo lake"`<br>`  src="lake-1200.avif"`<br>`  srcset="lake-600.avif 600w, lake-1200.avif 1200w"`<br>`  sizes="(width < 800px) 100vw, 800px"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br>`.lake::preview {`<br>`  background-image: url("lake-thumb.avif");`<br>`}` |
| **Wide and portrait crops** | **HTML**<br><br>`<picture>`<br>`  <source`<br>`    media="(width >= 800px)"`<br>`    srcset="lake-wide.avif"`<br>`    preview='url("lake-wide-thumb.avif")'`<br>`    width="1200" height="800">`<br>`  <img`<br>`    src="lake-portrait.avif"`<br>`    preview='url("lake-portrait-thumb.avif")'`<br>`    width="600" height="800"`<br>`    alt="A mountain reflected in a lake">`<br>`</picture>`<br><br>**CSS**<br><br>None required.<br><br>The preview follows the selected branch. A selected source does not inherit the image's preview. | **HTML**<br><br>`<picture>`<br>`  <source`<br>`    media="(width >= 800px)"`<br>`    srcset="lake-wide.avif"`<br>`    width="1200" height="800">`<br>`  <img`<br>`    class="photo lake"`<br>`    src="lake-portrait.avif"`<br>`    width="600" height="800"`<br>`    alt="A mountain reflected in a lake">`<br>`</picture>`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br>`.lake::preview {`<br>`  background-image: url("lake-portrait-thumb.avif");`<br>`}`<br>`@media (width >= 800px) {`<br>`  .lake::preview {`<br>`    background-image: url("lake-wide-thumb.avif");`<br>`  }`<br>`}`<br><br>Repeats the breakpoint. Media queries alone do not reproduce source-order or supported-type selection. |
| **Light and dark content variants** | **HTML**<br><br>`<picture>`<br>`  <source`<br>`    media="(prefers-color-scheme: dark)"`<br>`    srcset="rainfall-dark.avif"`<br>`    preview='url("rainfall-dark-thumb.avif")'>`<br>`  <img`<br>`    src="rainfall-light.avif"`<br>`    preview='url("rainfall-light-thumb.avif")'`<br>`    width="800" height="500"`<br>`    alt="Monthly rainfall over the past year">`<br>`</picture>`<br><br>**CSS**<br><br>None required. | **HTML**<br><br>`<picture>`<br>`  <source`<br>`    media="(prefers-color-scheme: dark)"`<br>`    srcset="rainfall-dark.avif">`<br>`  <img`<br>`    class="photo rainfall"`<br>`    src="rainfall-light.avif"`<br>`    width="800" height="500"`<br>`    alt="Monthly rainfall over the past year">`<br>`</picture>`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br>`.rainfall::preview {`<br>`  background-image: url("rainfall-light-thumb.avif");`<br>`}`<br>`@media (prefers-color-scheme: dark) {`<br>`  .rainfall::preview {`<br>`    background-image: url("rainfall-dark-thumb.avif");`<br>`  }`<br>`}` |
| **Preview sampling density** | **HTML**<br><br>`<img`<br>`  src="lake.avif"`<br>`  preview='url("thumb-32.avif")'`<br>`  previewset='url("thumb-32.avif") 1x, url("thumb-64.avif") 2x'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required.<br><br>Uses the proposal's candidate and fallback rules. | **HTML**<br><br>`<img`<br>`  class="photo lake"`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br>`.lake::preview {`<br>`  background-image: image-set(`<br>`    url("thumb-32.avif") 1x,`<br>`    url("thumb-64.avif") 2x`<br>`  );`<br>`}`<br><br>Similar intent, using CSS `image-set()` rules rather than an identical selection algorithm. |

Neither preview's dimensions or density determine the host's layout.

### Updates, policy, and decoration

| Use case | HTML preview | CSS preview |
| --- | --- | --- |
| **Script updates in a gallery** | **HTML**<br><br>`<img`<br>`  id="gallery-image"`<br>`  src="lake.avif"`<br>`  preview='url("lake-thumb.avif")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required.<br><br>**JavaScript**<br><br>`const image = document.querySelector("#gallery-image");`<br>`const nextPhoto = {`<br>`  src: "forest.avif",`<br>`  preview: 'url("forest-thumb.avif")',`<br>`  alt: "Sunlight falling through a forest canopy"`<br>`};`<br>`image.alt = nextPhoto.alt;`<br>`image.preview = nextPhoto.preview;`<br>`image.src = nextPhoto.src;` | **HTML**<br><br>`<img`<br>`  id="gallery-image" class="photo"`<br>`  src="lake.avif"`<br>`  style='--image-preview: url("lake-thumb.avif")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-image: var(--image-preview, none);`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br><br>**JavaScript**<br><br>`const image = document.querySelector("#gallery-image");`<br>`const nextPhoto = {`<br>`  src: "forest.avif",`<br>`  preview: 'url("forest-thumb.avif")',`<br>`  alt: "Sunlight falling through a forest canopy"`<br>`};`<br>`image.alt = nextPhoto.alt;`<br>`image.style.setProperty(`<br>`  "--image-preview", nextPhoto.preview`<br>`);`<br>`image.src = nextPhoto.src;` |
| **CSP prohibits inline styles** | **HTML**<br><br>`<img`<br>`  src="lake.avif"`<br>`  preview='url("lake-thumb.avif")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required.<br><br>The attribute is not a style attribute; its URL remains subject to `img-src`. | **HTML**<br><br>`<link rel="stylesheet" href="/styles/image-previews.css">`<br>`<img`<br>`  class="photo lake"`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS in the allowed external stylesheet**<br><br>`.photo::preview {`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br>`.lake::preview {`<br>`  background-image: url("/lake-thumb.avif");`<br>`}`<br><br>Inline custom properties are blocked, not external per-image rules. See [CSP details](#csp-without-inline-styles). |
| **Lazy-loaded main image** | **HTML**<br><br>`<img`<br>`  loading="lazy"`<br>`  src="lake.avif"`<br>`  preview='url("lake-thumb.avif")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>None required.<br><br>The proposal defers preview processing with main-image loading. | **HTML**<br><br>`<img`<br>`  class="photo lake"`<br>`  loading="lazy"`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br>`.lake::preview {`<br>`  background-image: url("lake-thumb.avif");`<br>`}`<br><br>The comparison assumes the same deferral; ordinary background fetching does not automatically provide it. |
| **Preview-only blur** | **HTML**<br><br>`<img`<br>`  class="photo"`<br>`  src="lake.avif"`<br>`  preview='url("lake-thumb.avif")'`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  filter: blur(4px);`<br>`}` | **HTML**<br><br>`<img`<br>`  class="photo lake"`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.photo::preview {`<br>`  background-size: 100% 100%;`<br>`  background-repeat: no-repeat;`<br>`  filter: blur(4px);`<br>`}`<br>`.lake::preview {`<br>`  background-image: url("lake-thumb.avif");`<br>`}` |
| **Waiting decoration: shimmer** | **No preview input needed.**<br><br>**HTML**<br><br>`<img`<br>`  class="shimmer"`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.shimmer::image-placeholder {`<br>`  background-color: #e2e8f0;`<br>`  background-image: linear-gradient(`<br>`    100deg, transparent 35%,`<br>`    rgb(255 255 255 / 60%) 50%,`<br>`    transparent 65%`<br>`  );`<br>`  background-size: 200% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br>`.shimmer:image-phase(waiting)::image-placeholder {`<br>`  animation: shimmer 1.4s linear infinite;`<br>`}`<br>`@keyframes shimmer {`<br>`  from { background-position: 200% 0; }`<br>`  to { background-position: -100% 0; }`<br>`}`<br>`@media (prefers-reduced-motion: reduce) {`<br>`  .shimmer:image-phase(waiting)::image-placeholder {`<br>`    animation: none;`<br>`    background-image: none;`<br>`  }`<br>`}` | **No preview input needed.**<br><br>**HTML**<br><br>`<img`<br>`  class="shimmer"`<br>`  src="lake.avif"`<br>`  width="1200" height="800"`<br>`  alt="A mountain reflected in a lake">`<br><br>**CSS**<br><br>`.shimmer::image-placeholder {`<br>`  background-color: #e2e8f0;`<br>`  background-image: linear-gradient(`<br>`    100deg, transparent 35%,`<br>`    rgb(255 255 255 / 60%) 50%,`<br>`    transparent 65%`<br>`  );`<br>`  background-size: 200% 100%;`<br>`  background-repeat: no-repeat;`<br>`}`<br>`.shimmer:image-phase(waiting)::image-placeholder {`<br>`  animation: shimmer 1.4s linear infinite;`<br>`}`<br>`@keyframes shimmer {`<br>`  from { background-position: 200% 0; }`<br>`  to { background-position: -100% 0; }`<br>`}`<br>`@media (prefers-reduced-motion: reduce) {`<br>`  .shimmer:image-phase(waiting)::image-placeholder {`<br>`    animation: none;`<br>`    background-image: none;`<br>`  }`<br>`}` |

For gallery updates, `nextPhoto.preview` contains a typed value such as `url("forest-thumb.avif")`. Neither assignment sequence is an atomic update API. Both require stale-work cancellation; whether a new preview replaces retained main-image content remains [open](explainer.md#presentation-during-source-replacement). Independent loading of previews ahead of lazy main images also remains open.

## Shared CSS

Use the following with the CSS-defined background-image examples:

```css
.photo::preview {
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
```

This stretches the background to the preview part's painting area. The examples use thumbnails with the same aspect ratio as their corresponding main image. Backgrounds have their own sizing and positioning rules; inherited `object-fit` does not fit them.

Both alternatives can optionally style preview content:

```css
.photo::preview {
  filter: blur(4px);
}
```

## Shimmer without a preview input

Under the current styling sketch, shimmer is waiting decoration on `::image-placeholder`. This example is shared by both alternatives and requires neither a `preview` attribute nor a source on `::preview`.

```html
<img
  class="shimmer"
  src="mountain-lake.avif"
  width="1200"
  height="800"
  alt="A mountain reflected in a lake">
```

```css
.shimmer::image-placeholder {
  background-color: #e2e8f0;
  background-image: linear-gradient(
    100deg,
    transparent 35%,
    rgb(255 255 255 / 60%) 50%,
    transparent 65%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
}

.shimmer:image-phase(waiting)::image-placeholder {
  animation: image-placeholder-shimmer 1.4s linear infinite;
}

@keyframes image-placeholder-shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -100% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shimmer:image-phase(waiting)::image-placeholder {
    animation: none;
    background-image: none;
  }
}
```

The dimensions reserve space before the image arrives. The sketch displays the placeholder during `waiting`, including lazy deferral, and hides it outside that phase. The animation rule also stops matching when waiting ends. With reduced motion requested, the placeholder remains a static color.

If a representative preview is supplied, the shimmer ends when either that preview or the main image is selected for display. It does not continue over the preview. Native main-image presentation, including progressive content, needs no author loading-event handlers or opacity rule hiding `::image`.

This covers common waiting decoration, not every loading experience. The sketch does not expose a general loading state while old image content remains visible, and unchanged phases do not trigger image-to-image transitions. Waiting for a complete first frame requires the independent reveal design. Geometry, filters, and interrupted exits also remain open work. These limits do not by themselves establish a need for a preview-source API.

## Analogy: the video `poster` attribute

The existing `<video poster>` attribute supplies representative content separately from the main media resource:

```html
<video
  src="mountain-lake.webm"
  poster="mountain-lake-poster.avif"
  width="1200"
  height="800"
  controls>
</video>
```

The poster represents the video; it is not merely decoration. HTML identifies the resource, and the browser manages its presentation under video-specific rules. Similarly, an HTML image preview identifies temporary representative content.

This separates **what supplies temporary content** from **what controls its presentation**. A dedicated HTML attribute supplies it directly; a background on `::preview` is another option under this comparison's lifecycle assumptions.

A background on the media element itself is not equivalent:

```css
video {
  background-image: url("mountain-lake-poster.avif");
}
```

That paints a background, but does not select a poster or acquire its lifecycle. The same distinction applies to a background on `<img>` versus the lifecycle-managed `::preview` part. This comparison does not extend `::preview` to video.

The analogy has limits: `poster` accepts a URL, while `preview` also proposes colors and compact representations. Poster presentation follows video rules rather than the image preview's native-image handoff. This precedent does not establish that CSS is an unsuitable alternative.

## CSP without inline styles

This response header permits same-origin stylesheets and image resources, but blocks `style` attributes and inline `<style>` blocks:

```http
Content-Security-Policy: default-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'
```

HTML preview attributes remain usable, subject to image-source policy. CSS previews can use a permitted external stylesheet:

```html
<link rel="stylesheet" href="/styles/image-previews.css">
<img
  class="photo lake"
  src="lake.avif"
  width="1200"
  height="800"
  alt="A mountain reflected in a lake">
```

In `/styles/image-previews.css`:

```css
.photo::preview {
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.lake::preview {
  background-image: url("/lake-thumb.avif");
}
```

The root-relative background URL resolves from the origin root, not the stylesheet directory, and remains subject to `img-src`. Shared shimmer rules can likewise live in an allowed stylesheet.

This restriction on inline style text is not a blanket prohibition on script-driven CSS updates. Setting `style` attributes or `style.cssText` is blocked, but individual CSSOM property updates such as `style.setProperty()` are not blocked by `style-src-attr` in the same way. Script execution is separately governed by script policy. A nonce can authorize a `<style>` block under a suitable policy, but adding a nonce to an `<img>` does not authorize its `style` attribute. See [`style-src-attr`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr).

## Other considerations

**Attribute-based CSS values.** Custom properties and inline styles can colocate preview data with image markup. `attr()` is not a general replacement for preview URL attributes: [attribute-tainted values cannot be used as or in URLs](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/attr#limitations_and_security).

**Discovery and security.** HTML declarations can expose a preview before external styles resolve; this does not establish earlier painting, because rendering also depends on applicable styles. Relative CSS URLs use CSS URL-resolution rules, not necessarily the document base used by HTML previews. CSS request policies and security integration must be specified rather than assuming all `<img>` preview-fetch rules transfer unchanged.

**Conclusion.** Direct image-data association, selected-source ownership, and authoring without inline-style permission favor HTML in relevant cases. Cascade-based selection and reuse favor CSS in others. Common waiting decoration needs neither preview-source mechanism: the independent styling sketch provides `::image-placeholder`. These are authoring tradeoffs, not a strict division between meaningful HTML content and decorative CSS.
