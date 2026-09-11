# Image Preview for HTML Images

## Status of this Document

- **Status:** Active draft
- **Draft focus:** The core proposal and the minimum developer-viable feature boundary.
- **Proposed incubation venue:** [WICG](https://wicg.io/)
- **Expected standards venue:** [WHATWG HTML](https://html.spec.whatwg.org/)
- **Current version:** This draft
- **Last updated:** 2026-09-10

## Authors

- [Olga Gerchikov](mailto:gerchiko@microsoft.com)
- [Alex Russell](mailto:alexrussell@microsoft.com)

## Participate

- **Issue tracker:** [Image Preview issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Image%20Preview)
- **File a new issue:** [Image Preview issue template](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?template=image-preview.md)

## Table of Contents

- [Status of this Document](#status-of-this-document)
- [Authors](#authors)
- [Participate](#participate)
- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
  - [How authors provide previews today](#how-authors-provide-previews-today)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
- [Core Proposal](#core-proposal)
  - [Open question: Minimum viable feature](#open-question-minimum-viable-feature)
  - [Scope and responsive images](#scope-and-responsive-images)
  - [A low-resolution image preview](#a-low-resolution-image-preview)
  - [Fetching, scheduling, and HTML integration](#fetching-scheduling-and-html-integration)
  - [Preview lifecycle](#preview-lifecycle)
  - [Lifecycle decisions](#lifecycle-decisions)
  - [Source updates and image generations](#source-updates-and-image-generations)
  - [Image element state and rendering](#image-element-state-and-rendering)
  - [Compatibility and fallback](#compatibility-and-fallback)
- [Optional Capabilities](#optional-capabilities)
  - [Compact encoded preview formats](#compact-encoded-preview-formats)
  - [Customizable preview transitions](#customizable-preview-transitions)
  - [Script observability](#script-observability)
- [Alternatives considered](#alternatives-considered)
  - [CSS property for the preview source](#css-property-for-the-preview-source)
  - [Imperative-only image API](#imperative-only-image-api)
  - [Reuse the `poster` attribute](#reuse-the-poster-attribute)
  - [Progressive and incrementally decoded images](#progressive-and-incrementally-decoded-images)
  - [Native compact decoding without a managed lifecycle](#native-compact-decoding-without-a-managed-lifecycle)
  - [Author-scripted scoped View Transition](#author-scripted-scoped-view-transition)
  - [Script-provided fallback decoder](#script-provided-fallback-decoder)
- [Accessibility, Internationalization, Privacy, and Security Considerations](#accessibility-internationalization-privacy-and-security-considerations)
  - [Accessibility](#accessibility)
  - [Internationalization](#internationalization)
  - [Privacy](#privacy)
  - [Security](#security)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & acknowledgements](#references--acknowledgements)
  - [Specifications and guidance](#specifications-and-guidance)
  - [Compact preview formats](#compact-preview-formats)
  - [Implementation evidence](#implementation-evidence)
  - [Acknowledgements](#acknowledgements)
- [Appendix](#appendix)
  - [Core API definition](#core-api-definition)
    - [WebIDL](#webidl)
  - [Preview examples](#preview-examples)

## Introduction

**Image Preview lets a page provide a lightweight preview for an HTML image.** The browser shows the preview while the final image loads, then replaces it directly with the final image. This moves common preview decoding, lifecycle, and replacement behavior from site-specific code into the browser.

Authors set the preview with a new `previewsrc` attribute on `<img>`. Existing `src`, `srcset`, and `sizes` behavior continues to select the final image.

```html
<img
  previewsrc="photo-preview.avif"
  src="photo.avif"
  width="1200"
  height="800"
  alt="A mountain reflected in a lake">
```

## User-Facing Problem

When an image is slow to load, the user can see an empty region without enough information to understand what will appear there. This is common on slow connections and image-heavy pages.

Sites can show previews today, but each site must build its own solution. Current approaches use a CSS background on the final image, replace the `src` of one image, or stack a decoded canvas with the final image. The site must also manage decoding, replacement, source changes, and any transition.

**Example scenario:** A user opens a photo gallery on a slow connection. The page knows a small preview for each photo. With Image Preview, the browser can show those previews in the image elements and replace each one as its final image becomes ready.

### How authors provide previews today

The table below describes the major patterns used by current implementations. Representative examples are provided in the [appendix](#preview-examples).

| Pattern | Format | How it works | Examples and evidence |
| --- | --- | --- | --- |
| 1. CSS background preview with final image overlay | Base64 8×8 BMP; tiny JPEG embedded in SVG; BlurHash-derived WebP; ThumbHash-derived PNG | Set the preview as the CSS background of the final `<img>` or its wrapper. The final image paints over it or becomes opaque after loading. | [Unsplash](https://unsplash.com/); [Next.js `<Image>`](https://image-component.nextjs.gallery/placeholder); [Jesus Film with Next.js](https://github.com/JesusFilm/core/blob/b2825dcb70a75b12a01f536b2f4b9c5637e8c6e8/libs/journeys/ui/src/components/Image/Image.tsx); [Tommy Chow homepage gallery preview](https://tommychow.com/) |
| 2. Decoded compact hash canvas | BlurHash decoded to canvas pixels | Decode the hash in script and paint it into a canvas occupying the image's display area. Load the final `<img>` independently; after it loads or decodes, reveal it and hide or remove the canvas. | [Minds](https://www.minds.com/newsfeed/1565424642032668690); [Mastodon](https://github.com/mastodon/mastodon/blob/main/app/javascript/mastodon/components/blurhash.tsx); [Misskey](https://github.com/misskey-dev/misskey/blob/b3ce198f4c55ace4daeba4cb1858b3a85bc9529b/packages/frontend/src/components/MkImgWithBlurhash.vue); [Nextcloud Talk](https://github.com/nextcloud/spreed/blob/030f4ae2bd69e30077ad7dbac428ace1e9a325d2/src/components/MessagesList/MessagesGroup/Message/MessagePart/FilePreview.vue); [Jellyfin Vue](https://github.com/jellyfin/jellyfin-vue/blob/63edc21f2787706d094a190c93bdc97edd5c233e/packages/frontend/src/components/Layout/Images/Blurhash/BlurhashImage.vue) |
| 3. Single-image source replacement | Cloudinary-transformed raster image; Cloudinary selects the delivered format automatically | Assign the placeholder URL to one `<img>`, preload the final resource, and replace the same element's `src`. | [Cloudinary training tool](https://cloudinary-training.github.io/cld-intro-react-sdk-training-tool/#/placeholder); [Cico Jazz hero](https://cicojazz.de/#hero); [Cloudinary plugin source](https://github.com/cloudinary/frontend-frameworks/blob/9a05f3571fec1a3d0ecc66a899db1833d326c094/packages/html/src/plugins/placeholder.ts#L10-L108) |
| 4. Progressive stacked preview layers | BlurHash, small thumbnail, and larger preview | Stack progressively better representations and fade in each layer after it loads. | [Nextcloud Photos](https://github.com/nextcloud/photos/blob/d12a25def30bf568d5e36339bea645203f7dba62/src/components/FileComponent.vue) |

### Goals

- Show useful image content before the final image is ready.
- Use one `<img>` for both the preview and final image.
- Support low-resolution previews using existing image formats and image-processing pipelines.
- Keep final-image selection in `src`, `srcset`, and `sizes`.
- Let the browser manage the preview lifecycle, reducing the need for custom markup and script.
- Never delay final-image discovery or request creation, and minimize network contention with the final image.
- Keep the final image and page usable when a preview format is unsupported.
- Allow separately specified image formats and transition mechanisms to build on the core lifecycle without changing the `previewsrc` API.

### Non-goals

- Generate a preview from the final image.
- Replace responsive image selection.
- Replace `loading`, `decoding`, or `fetchpriority`.
- Define skeleton or shimmer loading UI.
- Give the preview separate alternative text or separate semantics.
- Guarantee that a preview is displayed when the final image becomes ready first.

## Core Proposal

Add a URL-valued `previewsrc` attribute to `<img>`.

The preview is temporary visual content for the image. It is painted in the same image element. The final resource continues to come from the existing image source attributes.

Authors should provide a preview that represents the same content as the final image. The browser cannot verify that correspondence, but unrelated or misleading preview content can give users an incorrect understanding of the image while the final resource loads.

The proposal is divided along specification and implementation boundaries:

| Capability | Scope | Intended venue |
| --- | --- | --- |
| `previewsrc` and `previewSrc` | Core | WHATWG HTML |
| Preview fetching, decoding, display, replacement, and cancellation | Core | WHATWG HTML |
| Compact encodings such as BlurHash or ThumbHash | Independent image formats | Their respective format specifications and registrations |
| Animated and author-customizable replacement | Optional extension | CSS View Transitions |
| Script-visible preview or handoff state | Deferred pending demonstrated use cases | To be determined |

### Open question: Minimum viable feature

Although the capabilities in the table above can be specified and implemented independently, it remains unclear which combination constitutes a developer-viable initial release.

The core `previewsrc` API is usable with existing image formats and the [core handoff](#preview-lifecycle). However, requiring a separate raster preview might not provide enough transfer-size or authoring benefit over existing techniques. Similarly, developers might continue using custom markup and script if a visually acceptable handoff requires transition support.

Possible deployment boundaries are:

| MVP option | Included capabilities | Tradeoff |
| --- | --- | --- |
| Lifecycle only | `previewsrc` with existing image formats and the core handoff | Smallest platform change, but potentially limited benefit over current raster-placeholder techniques |
| Lifecycle and compact formats | `previewsrc` plus at least one compact preview format | Provides transfer-size and decoder benefits, but replacement is not customizable |
| Complete developer experience | `previewsrc`, compact formats, and customizable transitions | Addresses loading, payload size, and handoff UX, but depends on work across multiple specifications and implementation areas |

The decision should be informed by developer research and prototyping that answers:

- Would developers adopt `previewsrc` using only existing raster formats?
- Is support for at least one compact format necessary to justify replacing current BlurHash or ThumbHash libraries?
- Is the core handoff acceptable, or would the absence of transition customization cause developers to retain custom preview components?
- Can the capabilities ship incrementally without sites depending on an unreliable combination of feature support?

### Scope and responsive images

The core proposal applies only to HTML `<img>`. It does not add attributes to `<source>`, `<input type="image">`, SVG `<image>`, `<object>`, or `<embed>`.

An `<img>` inside `<picture>` can use `previewsrc`, but the preview belongs to the `<img>` rather than to an individual `<source>`. The existing `<picture>`, `srcset`, and `sizes` algorithms continue selecting the final image. Version 1 deliberately provides one non-responsive preview URL and does not define `previewsrcset` or `previewsizes`.

The preview should therefore represent every final candidate that the `<picture>` or `srcset` can select. If art direction, localization, writing direction, color scheme, or another condition changes the image's subject materially, the author should use a neutral preview suitable for every candidate or omit `previewsrc`. Responsive preview selection can be considered as a later extension if implementation experience demonstrates that one preview is insufficient.

### A low-resolution image preview

An author can use a small, low-resolution JPEG, WebP, or AVIF image as the preview:

```html
<img
  previewsrc="/images/forest-32.avif"
  src="/images/forest-1600.avif"
  srcset="/images/forest-800.avif 800w,
          /images/forest-1600.avif 1600w"
  sizes="(max-width: 700px) 100vw, 700px"
  width="1600"
  height="1067"
  loading="lazy"
  decoding="async"
  alt="Forest trail in autumn">
```

The browser uses `previewsrc` for the preview. It uses the existing responsive-image algorithm to select the final image from `srcset` and `sizes`.

The preview can also be an inline data URL:

```html
<img
  previewsrc="data:image/avif;base64,..."
  src="/images/city.avif"
  width="1600"
  height="900"
  alt="City skyline at dusk">
```

Inlining avoids a separate preview request, but increases the size of the containing document.

### Fetching, scheduling, and HTML integration

`previewsrc` is a URL-valued content attribute reflected by the `previewSrc` `USVString` property using the same URL-reflection behavior as `src`. Reading `previewSrc` returns the resolved absolute URL, while `getAttribute("previewsrc")` returns the serialized attribute value. A missing or empty `previewsrc` means that the element has no preview. Removing or emptying the attribute makes pending preview work obsolete and allows the browser to cancel it.

Preview processing is integrated into HTML's existing [update the image data](https://html.spec.whatwg.org/multipage/images.html#update-the-image-data) processing model:

1. The browser selects the final image from `src`, `srcset`, `<picture>`, and `sizes`, and creates or updates the final-image request without waiting for the preview.
2. When the browser begins loading the selected final image, if the element has a non-empty `previewsrc`, it resolves the preview URL against the document base URL and may create a preview request.
3. Preview and final requests form the [image generation](#source-updates-and-image-generations) associated with that invocation.

If an update leaves the element without a valid final-image candidate, the browser does not process `previewsrc`. Pending preview work becomes obsolete, and a displayed preview is removed; the element then follows its ordinary no-source or broken-image rendering behavior. A preview cannot serve as a standalone image or fallback source.

When `previewsrc` resolves to the same URL as the selected final image, the browser may reuse the same fetch and decode rather than perform duplicate work. The resource is treated as the final image and does not participate in the preview lifecycle.

Final-image discovery, selection, and request creation must not wait for preview fetching or decoding. The browser schedules best-effort preview work so that it does not block those final-image operations and may choose its network, decoding, or task priority accordingly. An additional request can still consume bandwidth or contend with the final image.

The element's `fetchpriority` and `decoding` attributes continue to describe the final image. Version 1 adds no preview-specific priority control: preview decoding is asynchronous and best-effort. The browser may skip the preview when the final image is already available or when its scheduling policy determines that the preview is unlikely to be useful before the final image.

The preview is fetched with destination `image` and follows the same URL parsing, CORS, credentials, referrer-policy, Content Security Policy `img-src`, mixed-content, cookie, HTTP-cache, network-partitioning, and service-worker rules as other `<img>` requests. A separately fetched preview produces a Resource Timing entry under the rules for image requests, with `initiatorType` equal to `"img"`. The preview URL is not exposed through `currentSrc`.

### Preview lifecycle

In this explainer, *ready to paint* means that a successfully fetched and decoded image representation is available for the browser to render. It does not mean that a rendering update has already painted the pixels, and it does not introduce a new script-visible state. A specification would express this condition using the existing HTML image-request and decoding states.

The proposed end-to-end flow is:

```mermaid
flowchart LR
  A[Preview and final requests active] -->|Preview ready first| D[Preview displayed]
  A -->|Final ready first| F[Final image displayed]
  D -->|Final image ready| F
  A -->|Preview unavailable| G[No preview displayed]
  G -->|Final image ready| F
```

The numbered steps below are the text alternative for the diagram:

1. After the requests begin under the [fetching and scheduling rules](#fetching-scheduling-and-html-integration), they proceed independently.
2. If the preview becomes ready to paint while the final image is still pending, the browser displays the preview in the `<img>`.
3. When the final image becomes ready to paint, the browser directly replaces the preview with the final image.
4. If the final image becomes ready first, the browser displays it without waiting.
5. A skipped, blocked, unsupported, malformed, or failed preview leaves no preview displayed and does not alter final-image loading.

### Lifecycle decisions

- **Lazy loading:** Preview fetching follows the final image's lazy-loading behavior. If `loading="lazy"` causes the browser to defer the final-image request, it must also defer the preview request. When the browser begins loading the final image, it may begin best-effort preview processing according to the scheduling rules above.
- **Final-image failure:** If the final image fails, the browser stops displaying the preview and uses the element's normal broken-image and alternative-text rendering. A preview is temporary and cannot become successful fallback content.
- **Animated previews:** If the selected preview format is animated, only its first successfully decoded frame is displayed. Preview animation does not run.
- **Data-saving and resource pressure:** The browser may omit or abandon this best-effort preview in response to reduced-data preferences, memory pressure, battery constraints, or similar resource policy. The core API exposes no dedicated reason or outcome for this decision, although existing facilities such as Resource Timing can reveal whether a separate request occurred.
- **Disconnection:** Disconnecting an element makes preview work obsolete when the corresponding final-image request is no longer relevant under the existing image-loading model. Reconnection runs the normal image-data update process.
- **Document lifecycle:** Freezing a document for BFCache cancels any optional animated handoff. Already-painted and decoded state may be preserved to the same extent as ordinary `<img>` state. Discarding the document makes preview work obsolete.

### Source updates and image generations

Script can update the reflected preview property and the final source, as in a dynamic image gallery:

```js
const image = document.querySelector("#gallery-image");

image.previewSrc = photo.previewUrl;
image.src = photo.url;
```

Changes to `previewsrc`, `src`, `srcset`, `sizes`, and relevant `<source>` elements participate in HTML's existing image-data update processing. For explanatory purposes, this document calls the preview and final-image work associated with one such update an *image generation*; it does not introduce a script-visible generation object.

Results from older generations are ignored and cannot newly replace painted content. The browser cancels obsolete requests, decoding, and optional handoffs when possible, including when a newer generation supersedes them, the final image becomes ready first, or the document is discarded. Previously painted content may remain until the current generation has a preview or final image ready.

### Image element state and rendering

The browser temporarily displays the preview inside the image element, but the selected final image remains the element's current image resource. Standard `HTMLImageElement` state and events, including `currentSrc`, `complete`, `naturalWidth`, `naturalHeight`, `decode()`, `load`, and `error`, continue to describe the selected final image.

The preview does not determine the image element's intrinsic dimensions, `naturalWidth`, `naturalHeight`, or layout size. Its decoded dimensions and aspect ratio are used only to fit and position its pixels within the element's content box using the existing `object-fit` and `object-position` properties. Once available, the final image remains the source of the element's intrinsic dimensions and related API state.

The preview is not exposed through `drawImage()`, `createImageBitmap()`, or other image-extraction APIs. While only the preview is displayed, those APIs behave exactly as they do when the final image has no available image data; they do not use preview pixels. Once the final image is available, they use it under their existing algorithms.

Context menus, drag operations, saving, accessibility, and other semantics continue to identify the final image and its `src`/`currentSrc`, not the preview.

The rendering outcomes are:

| Preview state | Final-image state | Rendering |
| --- | --- | --- |
| Missing, pending, skipped, or failed | Pending | Normal pending-image rendering |
| Ready | Pending | Preview |
| Any state | Ready | Final image |
| Any state | Failed | Normal broken-image and `alt` rendering |

### Compatibility and fallback

In a browser that does not implement Image Preview, the unrecognized `previewsrc` attribute has no effect and the existing final-image attributes continue to work.

Script can detect support for the reflected property:

```js
const supportsImagePreview =
  "previewSrc" in HTMLImageElement.prototype;
```

Unsupported formats follow the general preview-unavailable behavior. Support for optional [compact preview formats](#compact-encoded-preview-formats) is independent of support for `previewsrc`.

Developer tools may report that a preview was skipped, blocked, unsupported, or failed, but such diagnostics are not a web-observable API and are outside the HTML feature definition.

## Optional Capabilities

The following sections expand the optional and deferred capabilities identified in the [scope table](#core-proposal). They are independently specifiable, but whether some or all are required for a developer-viable initial release remains an [open question](#open-question-minimum-viable-feature).

### Compact encoded preview formats

`previewsrc` accepts any image resource that the browser can decode. It therefore benefits automatically from compact image formats if those formats are specified and implemented, but the core proposal does not define, require, or special-case them.

BlurHash and ThumbHash are examples of compact encodings that could be separately specified and registered as image formats. The media type and data URL serialization below are illustrative pending that work.

An author could provide a BlurHash value:

```html
<img
  previewsrc="data:image/blurhash,LEHV6nWB2yk8pyo0adR*.7kCMdnj"
  src="/images/portrait.jpg"
  width="800"
  height="1000"
  alt="Portrait of a person">
```

A separately specified ThumbHash image format could use an analogous data URL with its registered media type and serialization.

Each compact format specification must define its media type and serialization; encoded-size, decoded-dimension, memory, and processing limits; malformed-input behavior; and a prohibition on nested network requests.

### Customizable preview transitions

A separate transition extension could let the browser animate the replacement using [Element Scoped View Transitions](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using_element-scoped). Authors could customize that handoff using an `:active-image-preview-transition` pseudo-class and the scoped View Transition pseudo-elements:

```css
img:active-image-preview-transition::view-transition-old(root) {
  animation: 200ms ease-out both image-preview-fade-out;
}

img:active-image-preview-transition::view-transition-new(root) {
  animation: 200ms ease-in both image-preview-fade-in;
}

@keyframes image-preview-fade-out {
  to {
    opacity: 0;
  }
}

@keyframes image-preview-fade-in {
  from {
    opacity: 0;
  }
}
```

While the pseudo-class matches, the `old(root)` snapshot represents the displayed preview and the `new(root)` snapshot represents the final image. The state ends when the handoff finishes or is canceled.

When a transition is unavailable or inappropriate, including because of reduced-motion preferences, the [core lifecycle](#preview-lifecycle) applies.

The transition extension must separately define its default duration and easing, cancellation behavior, interaction with concurrent author transitions, and behavior during source changes and document lifecycle transitions.

### Script observability

The [core image state and rendering model](#image-element-state-and-rendering) provides no preview lifecycle hook.

If concrete use cases establish a need for script observability, a follow-up proposal should evaluate an event, callback, or promise together with any transition object. It must also account for the additional timing and format-support information exposed by preview success, failure, and handoff timing.

## Alternatives considered

### CSS property for the preview source

The preview could be supplied through CSS instead of an HTML attribute:

```html
<img
  class="gallery-image"
  src="/images/forest-1600.avif"
  width="1600"
  height="1067"
  alt="Forest trail in autumn">
```

```css
.gallery-image {
  image-preview-source: url("/images/forest-32.avif");
}
```

This would allow style rules and media queries to select previews. However, a preview represents the image's content rather than its presentation. Placing its URL in CSS separates it from `src`, complicates per-image updates, and provides no natural reflected `HTMLImageElement` property.

### Imperative-only image API

The browser-managed preview lifecycle could be exposed only through JavaScript:

```html
<img
  id="gallery-image"
  src="/images/forest-1600.avif"
  width="1600"
  height="1067"
  alt="Forest trail in autumn">
```

```js
const image = document.querySelector("#gallery-image");

image.setPreviewSource("/images/forest-32.avif");
```

This could accommodate imperative options, but it would require script for a basic loading feature, delay preview discovery until script runs, and prevent server-rendered markup from expressing it. A reflected attribute supports both declarative and dynamic use.

### Reuse the `poster` attribute

The `<video>` element uses `poster` to identify an image shown before video data is available. The same attribute could be added to `<img>`:

```html
<img
  poster="/images/forest-32.avif"
  src="/images/forest-1600.avif"
  alt="Forest trail in autumn">
```

Although `poster` already identifies temporary visual content, its semantics are specific to video. Adding it to `<img>` would still require new image-loading and handoff behavior. `previewsrc` names its relationship to the final image explicitly.

### Progressive and incrementally decoded images

Progressive JPEG, interlaced image formats, and incremental decoding can reveal an increasingly complete version of one image as its bytes arrive. They avoid an additional resource request and can be the best option when the selected final format, encoder, delivery path, and browser produce useful intermediate paints.

They do not replace every preview use case:

- Intermediate quality and paint timing depend on the format, encoding parameters, decoder, and browser.
- A site cannot provide a separately generated semantic preview, compact hash, or differently processed placeholder independently of the final resource.
- A site's final-image format or image CDN might not support predictable progressive rendering.
- Changing the final source because of responsive selection, art direction, or application state also changes the progressive stream.

Conversely, `previewsrc` can use an existing small image, be inlined, or be cached independently of the final image, and works regardless of whether the final format renders progressively. Its cost is an additional resource and possible bandwidth contention. Authors should prefer progressive delivery when it provides an adequate experience without that cost; Image Preview is complementary for cases that require an independently supplied preview.

### Native compact decoding without a managed lifecycle

The browser could natively decode compact image formats while authors provide the preview and final image as separate elements:

```html
<div class="image-frame">
  <img
    class="preview"
    src="data:image/blurhash,LEHV6nWB2yk8pyo0adR*.7kCMdnj"
    alt="">
  <img
    class="final"
    src="/images/portrait.jpg"
    alt="Portrait of a person">
</div>
```

This would remove the need for a format-specific decoder library. Authors would still need to coordinate two elements, loading, source changes, failures, accessibility, and the preview-to-final transition. The proposed approach combines native decoding with a browser-managed lifecycle on one semantic image element.

### Author-scripted scoped View Transition

The platform could provide native compact decoding and scoped View Transitions but leave the handoff to author script:

```html
<img
  id="photo"
  src="data:image/blurhash,LEHV6nWB2yk8pyo0adR*.7kCMdnj"
  alt="Portrait of a person">
```

```js
const photo = document.querySelector("#photo");
const finalImage = new Image();
finalImage.src = "/images/portrait.jpg";
await finalImage.decode();

const transition = photo.startViewTransition(async () => {
  photo.src = finalImage.src;
  await photo.decode();
});

await transition.finished;
```

This gives authors full control and reuses a general transition API. It still requires every page to preload the final image, avoid stale source updates, and handle failures and cancellation. The core proposal makes the loading and replacement lifecycle browser-managed; the optional transition extension could additionally provide CSS customization while respecting reduced-motion and hidden-document behavior.

### Script-provided fallback decoder

The browser could manage the preview lifecycle but invoke an author-registered decoder when it does not support the preview's media type:

```html
<img
  previewsrc="data:image/blurhash,LEHV6nWB2yk8pyo0adR*.7kCMdnj"
  src="/images/portrait.jpg"
  alt="Portrait of a person">
```

```js
navigator.imagePreview.registerDecoder(
  "image/blurhash",
  async (bytes, options) => decodeBlurHash(bytes, options)
);
```

This would make additional formats extensible without requiring native decoders for each one. However, previews would depend on script loading and execution, and the API would need to define decoder lifetime, cancellation, security, failure handling, output dimensions, color handling, and resource limits. Native decoding provides predictable behavior without page-supplied code.

## Accessibility, Internationalization, Privacy, and Security Considerations

### Accessibility

The proposal uses one `<img>` for the preview and final image. The existing `alt` attribute describes that image.

The preview must represent the same content described by the `alt` attribute and must not create a second accessibility node or a second announcement. The [core handoff](#preview-lifecycle) does not animate. Any optional transition mechanism must respect `prefers-reduced-motion`.

### Internationalization

The proposal adds no user-facing text and no language-sensitive processing.

The guidance for localized or direction-dependent image candidates is covered by [Scope and responsive images](#scope-and-responsive-images).

### Privacy

A URL in `previewsrc` can cause an additional request, with the same general privacy implications as requesting another image through `src`. The origin serving the preview can learn that the resource was requested.

Existing image-fetch and Resource Timing protections limit what the document can observe about the additional request, as detailed in [Fetching, scheduling, and HTML integration](#fetching-scheduling-and-html-integration). The core API provides no preview-specific outcome or reason when the browser omits preview work under reduced-data or resource-pressure policies. However, existing Resource Timing information can let the document infer whether a separate preview request occurred.

The core proposal adds no API exposing preview readiness, dimensions, decode failures, or handoff timing. Existing Resource Timing entries can expose ordinary request information to the extent already allowed for images. Adding a preview-specific state surface would reveal additional content-observation or format-support information and requires a separate privacy review. The optional transition pseudo-class can reveal through applied styling that a preview was displayed and its handoff began, but it does not expose preview metadata.

### Security

`previewsrc` follows the same URL parsing, Content Security Policy `img-src`, mixed-content, and image-fetching rules as `src`, unless a specific difference is identified.

Preview decoding must enforce the limits applicable to the selected image format. Obsolete decoding work must be abortable, and repeated source changes must not create unbounded concurrent decoding work. Malformed or adversarial input must fail without affecting the final image. Separately specified compact formats require their own bounds and security analysis, including a prohibition on nested network requests.

Because the preview is not exposed through image-extraction APIs, its origin does not independently affect canvas origin cleanliness. Canvas access continues to follow the origin-clean rules for the final image.


## Stakeholder Feedback / Opposition

| Stakeholder | Signal | Source |
| --- | --- | --- |
| Chromium | No position requested | — |
| Gecko | No position requested | — |
| WebKit | No position requested | — |
| WHATWG | No review requested | — |
| Web developers | No public signal gathered | — |

## References & acknowledgements

### Specifications and guidance

- [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [CSS View Transitions Module Level 2](https://www.w3.org/TR/css-view-transitions-2/)
- [HTML: Images](https://html.spec.whatwg.org/multipage/images.html)
- [Mixed Content](https://www.w3.org/TR/mixed-content/)
- [Referrer Policy](https://www.w3.org/TR/referrer-policy/)
- [Resource Timing Level 2](https://www.w3.org/TR/resource-timing/)

### Compact preview formats

- [BlurHash](https://github.com/woltapp/blurhash)
- [ThumbHash](https://github.com/evanw/thumbhash)

### Implementation evidence

- [Cloudinary placeholder plugin](https://github.com/cloudinary/frontend-frameworks/blob/9a05f3571fec1a3d0ecc66a899db1833d326c094/packages/html/src/plugins/placeholder.ts#L10-L108)
- [Mastodon BlurHash component](https://github.com/mastodon/mastodon/blob/main/app/javascript/mastodon/components/blurhash.tsx)
- [Minds BlurHash directive](https://github.com/Minds/front/blob/e51f12214cf9324c5e432362e16cf289054a2ca7/src/app/common/directives/blurhash/blurhash.directive.ts)
- [Nextcloud Photos progressive preview component](https://github.com/nextcloud/photos/blob/d12a25def30bf568d5e36339bea645203f7dba62/src/components/FileComponent.vue)
- [Next.js Image documentation](https://nextjs.org/docs/pages/api-reference/components/image) and [placeholder demo](https://image-component.nextjs.gallery/placeholder)
- [Tommy Chow Photography ThumbHash implementation](https://github.com/tommyxchow/tommychow.com/blob/a2fac8f866e608c37b711b024ab873e326287733/src/app/GalleryPreview.tsx)

### Acknowledgements

This proposal was informed by the public implementations and demonstrations cited above and throughout this explainer. In particular, the authors acknowledge the work of the BlurHash and ThumbHash projects and the application and framework developers whose preview implementations provided evidence of current practice. Their inclusion does not imply endorsement of this proposal.

## Appendix

### Core API definition

#### WebIDL

The core proposal adds one reflected property:

```webidl
partial interface HTMLImageElement {
  [CEReactions] attribute USVString previewSrc;
};
```

### Preview examples

These examples correspond to patterns 1 and 2 in [How authors provide previews today](#how-authors-provide-previews-today).

#### Pattern 1: CSS background preview with final image overlay — Next.js

The [Next.js image placeholder demo](https://image-component.nextjs.gallery/placeholder) renders a single `<img>` whose CSS background is an inline SVG containing a tiny JPEG preview:

```html
<img
  alt="Mountains"
  src="/_next/image?url=...&w=1920&q=75"
  srcset="/_next/image?url=...&w=750&q=75 1x,
          /_next/image?url=...&w=1920&q=75 2x"
  style="
    background-image: url('data:image/svg+xml,...');
    background-size: cover;
    background-position: 50% 50%;
    background-repeat: no-repeat;
  ">
```

After the final image loads and decoding settles, Next.js removes the background preview. See the [demo source](https://github.com/vercel/next.js/blob/canary/examples/image-component/app/placeholder/page.tsx), [background construction](https://github.com/vercel/next.js/blob/4fed8eaf197aaa60fd85371352482199a4c2107f/packages/next/src/shared/lib/get-img-props.ts), and [load handoff](https://github.com/vercel/next.js/blob/4fed8eaf197aaa60fd85371352482199a4c2107f/packages/next/src/client/image-component.tsx).

#### Pattern 2: Decoded compact hash canvas — Minds

On this [Minds post](https://www.minds.com/newsfeed/1565424642032668690), the site decodes BlurHash data into pixels and paints them into a canvas associated with the final image. When the image loads, Minds fades and removes the canvas. See the [Minds BlurHash directive](https://github.com/Minds/front/blob/e51f12214cf9324c5e432362e16cf289054a2ca7/src/app/common/directives/blurhash/blurhash.directive.ts).

The resulting structure is equivalent to:

```html
<div class="image-frame">
  <canvas class="preview" width="32" height="24"></canvas>
  <img class="final" src="photo.jpg" alt="...">
</div>
```
