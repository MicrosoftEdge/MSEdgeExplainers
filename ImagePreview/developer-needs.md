# Image Preview: developer needs and design response

Last updated: October 30, 2026.

This document links developer needs and supporting evidence to the revised [Image Preview proposal](explainer.md).

The main proposal covers `preview`, `previewset`, and their reflected properties, including responsive previews and art direction. Styling and reveal control are independent proposals sketched in the explainer's appendix.

Image Preview does not define compact formats or their encoding and decoding algorithms. These require separate specifications; `blurhash("...")` is illustrative syntax.

## Evidence and interpretation

The research combines public standards discussions reviewed on October 28, 2026, [existing preview implementations](explainer.md#how-authors-provide-previews-today), and anonymized internal partner feedback.

The sources establish needs and constraints, not API consensus or universal user benefit.

## Needs and proposal disposition

- **Main proposal:** within Image Preview's scope.
- **Styling** and **Reveal:** exploratory, independent designs in the appendix.
- **Open:** solution or scope not yet selected.
- **Invariant:** behavior the main proposal must preserve.

| ID | Developer need | Proposal disposition |
|---|---|---|
| [DN-01](#dn-01-reduce-custom-preview-lifecycle-code) | Reduce custom preview lifecycle code | Main proposal |
| [DN-02](#dn-02-choose-a-presentation-that-suits-the-content-and-context) | Choose an appropriate presentation, including no preview | Main proposal |
| [DN-03](#dn-03-use-lightweight-representations-and-existing-asset-pipelines) | Use lightweight representations and existing asset pipelines | Main proposal |
| [DN-04](#dn-04-keep-previews-aligned-with-responsive-images-and-art-direction) | Keep previews aligned with responsive images and art direction | Main proposal |
| [DN-05](#dn-05-control-loading-cost-without-delaying-important-content) | Control loading cost without delaying important content | Invariant; independent loading open |
| [DN-06](#dn-06-enable-previews-selectively-on-the-client) | Enable previews selectively on the client | Main proposal; browser-managed rules open |
| [DN-07](#dn-07-show-waiting-content-before-a-preview-is-available) | Show waiting content before a preview is available | Styling |
| [DN-08](#dn-08-style-image-pixels-with-correct-geometry-and-compositing) | Style image pixels with correct geometry and compositing | Invariant; Styling for customization |
| [DN-09](#dn-09-customize-activity-feedback-and-transitions) | Customize activity feedback and transitions | Styling |
| [DN-10](#dn-10-control-progressive-versus-complete-frame-presentation) | Control progressive versus complete-frame presentation | Reveal |
| [DN-11](#dn-11-handle-repeated-image-replacement) | Handle repeated image replacement | Main proposal; replacement presentation and transitions open |
| [DN-12](#dn-12-preserve-image-semantics-layout-and-accessibility) | Preserve image semantics, layout, and accessibility | Invariant |
| [DN-13](#dn-13-observe-and-measure-meaningful-loading-milestones) | Observe and measure meaningful loading milestones | Open |
| [DN-14](#dn-14-retain-predictable-fallback-and-platform-protections) | Retain predictable fallback and platform protections | Invariant |

## Developer needs

### DN-01: Reduce custom preview lifecycle code

**Need.** Replace per-component code for preview display, image loading, replacement, source changes, cancellation, and cleanup.

**Evidence.** [whatwg/html#3631][html3631] and [whatwg/html#2806][html2806] discuss native loading and placeholder behavior. Existing implementations and partner feedback identify the cost of managing this lifecycle in script.

**Proposal response.** The browser manages previews without changing main-image selection or the meaning of existing image APIs.

### DN-02: Choose a presentation that suits the content and context

**Need.** Choose whether a preview is useful for the content and, if so, whether to use a recognizable thumbnail, an abstract representation, or a color.

**Evidence.** [MicrosoftEdge/MSEdgeExplainers#1401][edge1401], [MicrosoftEdge/MSEdgeExplainers#1406][edge1406], and [MicrosoftEdge/MSEdgeExplainers#1407][edge1407] question preview usefulness and compare alternatives. Partner feedback requests choice and experimentation.

**Proposal response.** Authors choose whether to provide a preview and which representation to use. Previews complement progressive delivery rather than replace it.

### DN-03: Use lightweight representations and existing asset pipelines

**Need.** Keep previews inexpensive to transfer and decode, and reuse preview data already generated for web and native apps, including data embedded in HTML or API responses.

**Evidence.** [whatwg/html#3631][html3631] requests several input types; [MicrosoftEdge/MSEdgeExplainers#1406][edge1406] discusses quality-per-byte and format costs. Partner feedback adds compact response payloads and shared-pipeline compatibility.

**Proposal response.** `preview` accepts [URLs, compact representations, and colors](explainer.md#preview-values-and-reflection), allowing authors to reuse existing preview data.

### DN-04: Keep previews aligned with responsive images and art direction

**Need.** Match the preview to the selected image across different crops, subjects, resolutions, and color-scheme variants.

**Evidence.** [whatwg/html#3631][html3631] requests `<img>` and `<source>` support. [MicrosoftEdge/MSEdgeExplainers#1402][edge1402] raises art direction and light-preview flashes before dark-mode content.

**Proposal response.** `preview` associates content with the selected `<img>` or `<source>` branch; `previewset` adds density-based candidates. A dark-mode source can supply its own preview without falling back to a shared light preview.

### DN-05: Control loading cost without delaying important content

**Need.** Avoid delaying selected-image discovery or requests, and control the cost of previews, including those shown before lazy-loaded images.

**Evidence.** [MicrosoftEdge/MSEdgeExplainers#1404][edge1404] requests independent preview loading; [whatwg/html#5408][html5408] discusses lazy-loading gaps; [whatwg/html#1920][html1920] covers decoding and memory costs.

**Proposal response.** Preview work does not block main-image discovery or request creation, although extra requests can still compete for resources. Loading a preview ahead of its lazy-loaded main image remains an open question.

### DN-06: Enable previews selectively on the client

**Need.** Enable previews selectively based on client conditions and experiment with different loading experiences.

**Evidence.** Partner feedback requests client-side control. [w3c/csswg-drafts#11691][css11691] requests low-bandwidth image placeholders and bandwidth-based image selection.

**Proposal response.** Authors can choose whether to provide a `preview`, including from script. Whether the browser should offer a built-in rule such as "use previews only on slow connections" remains open.

### DN-07: Show waiting content before a preview is available

**Need.** Show useful initial content, such as an image-specific color, while preview data is unavailable. Even inline data can arrive late in a streamed document.

**Evidence.** [whatwg/html#3631][html3631] and the [2014 CSS placeholder proposal][css2014] discuss loading placeholders. Partner feedback explicitly requests waiting content before a preview arrives.

**Proposal response.** The styling appendix explores a placeholder part that works without preview data. A waiting background is separate from using a color as the preview itself.

### DN-08: Style image pixels with correct geometry and compositing

**Need.** Blur image content without blurring its outer edges or borders, align temporary content with the image box, and replace transparent content without unintended overlap.

**Evidence.** [w3c/csswg-drafts#3134][css3134], [w3c/csswg-drafts#8243][css8243], and [MicrosoftEdge/MSEdgeExplainers#1405][edge1405] cover styling, geometry, and alpha-correct crossfading. Partner feedback requests sharp outer edges around blurred content.

**Proposal response.** The main proposal preserves sizing, clipping, and replacement. The styling appendix explores parts that can be styled separately and blended together without mixing with the page background.

### DN-09: Customize activity feedback and transitions

**Need.** Provide optional, efficient activity feedback and transitions, with appearance, pace, and fade strength consistent with the site's other UI.

**Evidence.** [w3c/csswg-drafts#7467][css7467], [MicrosoftEdge/MSEdgeExplainers#1405][edge1405], and [w3c/csswg-drafts#9967][css9967] discuss image states and transition timing. Partner feedback requests customizable activity animation.

**Proposal response.** The styling appendix sketches presentation phases and author opt-in effects. Presentation phases differ from request states: an image may remain visible while a replacement loads.

### DN-10: Control progressive versus complete-frame presentation

**Need.** Choose between revealing progressive content promptly and retaining the current presentation until a complete first frame is decoded.

**Evidence.** [MicrosoftEdge/MSEdgeExplainers#1403][edge1403] discusses preview/progressive-image interaction. [whatwg/html#1920][html1920] and [w3c/element-timing#54][element54] distinguish loading, decoding, and intermediate rendering.

**Proposal response.** The main proposal preserves native timing. The independent `image-reveal: normal | complete-frame` sketch would optionally wait for a complete decoded first frame, with or without a preview.

### DN-11: Handle repeated image replacement

**Need.** Retain current content while successive images are prepared, including generated-image sequences that replace whole resources rather than progressively decode one file.

**Evidence.** [w3c/csswg-drafts#7467][css7467] discusses visible content coexisting with a pending request. Partner feedback requests support for successive generated images and transitions between them.

**Proposal response.** The [lifecycle](explainer.md#source-updates-and-image-generations) discards outdated results after source changes. Whether to [retain the old image or show a new preview](explainer.md#presentation-during-source-replacement), and how to animate successive images, remain open questions.

### DN-12: Preserve image semantics, layout, and accessibility

**Need.** Preserve layout, selected-image APIs, and one semantic image while accounting for visible alternative text and user preferences.

**Evidence.** [MicrosoftEdge/MSEdgeExplainers#1408][edge1408], [w3c/aria#1317][aria1317], and [w3c/wcag#2048][wcag2048] address visible alt text, loading announcements, and indicator contrast.

**Proposal response.** [Image semantics and layout](explainer.md#image-element-state-and-rendering) remain unchanged. A preview can displace visible loading-time `alt` text without removing its accessible description; the [accessibility guidance](explainer.md#accessibility) also covers motion and contrast.

### DN-13: Observe and measure meaningful loading milestones

**Need.** Know whether a preview loaded and appeared, coordinate UI with image replacement, and measure how previews affect the loading experience.

**Evidence.** [whatwg/html#3631][html3631] requests preview signals. [w3c/element-timing#54][element54], [w3c/largest-contentful-paint#71][lcp71], and [w3c/container-timing#24][container24] distinguish intermediate content from meaningful completion.

**Proposal response.** It remains open how authors can detect preview success or failure and how performance metrics should account for previews. Resource Timing describes a separately fetched preview's request, not whether it was decoded or displayed.

### DN-14: Retain predictable fallback and platform protections

**Need.** Keep ordinary images usable when previews fail or are unsupported, with predictable fallback, bounded resource use, and existing platform protections.

**Evidence.** [whatwg/html#3631][html3631] discusses failure behavior, compatibility, and CSP.

**Proposal response.** Preview failures do not block the main image; main-image failure uses [native fallback](explainer.md#lifecycle-decisions). [Security requirements](explainer.md#security) cover fetch protections and processing limits.

## Design evolution

The explainer's [earlier proposal versions](explainer.md#earlier-proposal-versions) preserve the old syntax and behavior, explain their limitations, and describe why the design changed.

[css2014]: https://lists.w3.org/Archives/Public/www-style/2014Jan/0046.html
[html3631]: https://github.com/whatwg/html/issues/3631
[html2806]: https://github.com/whatwg/html/issues/2806
[html1920]: https://github.com/whatwg/html/issues/1920
[html5408]: https://github.com/whatwg/html/issues/5408
[edge1401]: https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1401
[edge1402]: https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1402
[edge1403]: https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1403
[edge1404]: https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1404
[edge1405]: https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1405
[edge1406]: https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1406
[edge1407]: https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1407
[edge1408]: https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/1408
[css3134]: https://github.com/w3c/csswg-drafts/issues/3134
[css7467]: https://github.com/w3c/csswg-drafts/issues/7467
[css8243]: https://github.com/w3c/csswg-drafts/issues/8243
[css9967]: https://github.com/w3c/csswg-drafts/issues/9967
[css11691]: https://github.com/w3c/csswg-drafts/issues/11691
[aria1317]: https://github.com/w3c/aria/issues/1317
[wcag2048]: https://github.com/w3c/wcag/issues/2048
[element54]: https://github.com/w3c/element-timing/issues/54
[lcp71]: https://github.com/w3c/largest-contentful-paint/issues/71
[container24]: https://github.com/w3c/container-timing/issues/24
