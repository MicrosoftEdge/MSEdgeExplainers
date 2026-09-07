# Self-Review Questionnaire: Security and Privacy - Image Preview

- **Feature:** Image Preview for HTML Images
- **Explainer:** [explainer.md](explainer.md)
- **Questionnaire:** [W3C Security and Privacy Self-Review Questionnaire](https://w3c.github.io/security-questionnaire/)
- **Last updated:** 2026-09-07

## 2.1. What information does this feature expose, and for what purposes?

The core feature adds a `previewsrc` attribute and reflected `previewSrc` property containing a URL supplied by the page. The URL does not reveal information that the page did not provide.

The core proposal adds no preview-specific event, promise, state property, or CSS selector. A customizable transition and its CSS pseudo-class are described as an optional extension and are outside the core review.

Fetching a preview can disclose the request and ordinary request metadata to the origin serving it. This is the same class of disclosure as an additional image request through `src`.

## 2.2. Does the feature expose the minimum amount of information necessary?

The browser displays the preview without exposing its pixels, intrinsic dimensions, decode result, or independent state through a new API. Existing `HTMLImageElement` properties and events continue to describe the final image.

Existing platform facilities can still reveal ordinary network activity. In particular, a separately fetched preview can produce a Resource Timing entry, subject to the same-origin and `Timing-Allow-Origin` rules that apply to other image requests.

## 2.3. Does the feature expose personal information or PII?

No new personal information or PII is exposed by the API itself. A preview or final image can contain personal information, but both resources are selected by the page and are already rendered to the user as image content.

A third-party origin hosting a preview can learn that the preview was requested. Authors can already cause the same disclosure with an ordinary image request.

## 2.4. How does the feature deal with sensitive information?

The feature does not inspect, classify, or newly expose image content. The preview is displayed but is not available through `drawImage()`, `createImageBitmap()`, or other image-extraction APIs.

Preview requests follow the same credentials, referrer, Content Security Policy, mixed-content, cache-partitioning, service-worker interception, and image-fetching protections as final image requests.

Preview fetching follows the final image's lazy-loading eligibility and uses a lower internal priority. The final image's selection and request creation do not wait for the preview. Preview decoding is asynchronous and best-effort.

## 2.5. Does exposed data carry related but distinct information that may not be obvious?

The server providing a preview may receive request metadata even when the final image is hosted elsewhere. Authors should account for this additional request when choosing a preview URL.

Existing Resource Timing behavior can expose request timing and transfer information for the preview to the extent ordinarily available for image requests. The design does not add a signal indicating whether the preview decoded successfully, was painted, or was later replaced, and it does not expose preview metadata or independent intrinsic dimensions.

The browser can omit or abandon a preview under reduced-data, memory, battery, or similar resource policies. The core API does not expose that decision.

## 2.6. Does the feature introduce state that persists across browsing sessions?

No new persistent state is introduced. Preview responses can use the existing HTTP cache, subject to the same cache partitioning and clearing behavior as other image responses.

## 2.7. Does the feature expose information about the underlying platform?

Feature detection can reveal whether `previewSrc` is implemented. The core author API does not distinguish unsupported formats from blocked, skipped, malformed, or failed previews, which avoids adding a direct format-support fingerprinting surface.

Developer tools may provide diagnostics, but those diagnostics are not exposed to page script.

## 2.8. Does the specification allow an origin to send data to the underlying platform?

The page can provide an image URL or inline `data:` URL for decoding by the browser. This uses the browser's existing image fetching and decoding infrastructure rather than a new operating-system integration.

Compact formats are optional, separately specified image formats. Each such format must define bounded inputs and must not initiate nested network requests; the core feature does not require them.

## 2.9. Does the feature enable access to device sensors?

No.

## 2.10. Does the feature enable new script execution or loading mechanisms?

No. Preview resources are decoded as images and cannot execute script. A script-provided fallback decoder is discussed only as a rejected alternative and is not part of the proposed API.

## 2.11. Does the feature allow an origin to access other devices?

No. It can make ordinary image requests to network origins under existing web security rules, but it adds no device-discovery or device-access capability.

## 2.12. Does the feature allow control over browser-native UI?

No. It affects only rendering inside the page's `<img>` element. The core behavior directly replaces the preview with the final image and exposes no browser-native UI.

## 2.13. What temporary identifiers does the feature create or expose?

None. Internal image-generation identifiers used to reject obsolete work are not exposed to the page.

## 2.14. How does behavior differ between first-party and third-party contexts?

The API itself does not distinguish between first-party and third-party documents. Preview requests use the same context-dependent credentials, referrer, network isolation, cache partitioning, and Resource Timing protections as ordinary image requests.

A third-party origin serving a preview receives the request in the same way it would for an image referenced by `src`.

## 2.15. How does the feature work in Private Browsing or Incognito mode?

The feature creates no new persistent state and requires no special private-browsing behavior. Preview requests and cached responses follow the browser's existing private-browsing isolation and data-lifetime rules for images.

## 2.16. Does the specification have Security Considerations and Privacy Considerations?

Yes. The explainer contains separate [Privacy](explainer.md#privacy) and [Security](explainer.md#security) subsections.

## 2.17. Can origins downgrade default security protections?

No. `previewsrc` follows the same URL parsing, CSP `img-src`, mixed-content, credentials, referrer, and image-fetching rules as `src`. The feature provides no option to bypass those protections.

## 2.18. What happens when a document using the feature enters and leaves BFCache?

The feature introduces no state that needs to persist outside the document. Freezing a document for BFCache cancels any optional animated handoff. Already-painted and decoded state can be preserved to the same extent as ordinary `<img>` state.

When the document is restored, only results belonging to the current image-data update may be displayed. A stale preview result cannot newly replace current content.

## 2.19. What happens when an element using the feature is disconnected?

Disconnecting an element makes preview work obsolete when its corresponding final-image request is no longer relevant under the existing image-loading model. The browser must be able to stop obsolete decoding work.

Reconnection runs the normal image-data update process. A stale preview or final-image result cannot replace the current generation.

## 2.20. Does the specification define new errors?

The proposal adds no new DOM exceptions or preview-specific `load` or `error` events. A preview fetch, format, validation, or decode failure makes the preview unavailable and does not affect final-image loading. Existing `load`, `error`, and `decode()` behavior continues to describe the final image.

If the final image fails after a preview was displayed, the browser removes the preview and uses normal broken-image and alternative-text rendering. Developer tools may distinguish preview failures, but the core author API does not.

## 2.21. Can sites learn whether the user uses assistive technology?

No new assistive-technology signal is exposed. The preview and final image share one accessibility node and one `alt` value.

The core feature always performs a direct replacement. Any optional animated transition must respect `prefers-reduced-motion`. Sites can already query that preference; this feature does not expose which assistive technology, if any, caused it.

## 2.22. What should this questionnaire have asked?

For features that add an auxiliary resource for existing content:

- Can the additional request delay the primary resource through bandwidth or priority contention?
- Can differences between auxiliary-resource cache hits, decoding support, and failures create new timing or fingerprinting signals?
- When should auxiliary fetching and decoding be canceled as the document or primary resource state changes?

For this proposal, final-image discovery and request creation never wait for the preview, and the preview uses a lower internal priority. The core API does not distinguish preview outcomes. Preview work becomes obsolete when the final image is ready first, a newer image-data update supersedes it, the relevant disconnected element no longer needs it, or the document is discarded.
