# Self-Review Questionnaire: Security and Privacy - Image Preview

- **Feature:** Image Preview for HTML Images
- **Explainer:** [explainer.md](explainer.md)
- **Questionnaire:** [W3C Security and Privacy Self-Review Questionnaire](https://w3c.github.io/security-questionnaire/)
- **Last updated:** 2026-10-30

## 2.1. What information does this feature expose, and for what purposes?

The core adds `preview` and `previewset` attributes and properties to `<img>` and `<source>` in `<picture>`. They reflect author-supplied URLs, compact representations, and colors, not the browser's selected preview. `previewset` supplies density-based candidates for the selected branch.

The core adds no preview-specific events, promises, state properties, or selectors. The independent styling and reveal sketches are outside this review. Styling phases and inspectable transitions would expose presentation state and require separate privacy review.

Fetching an external preview URL discloses an ordinary image request and its metadata to the serving origin. Literal colors and compact payloads make no requests.

## 2.2. Does the feature expose the minimum amount of information necessary?

Yes. Existing image APIs retain their main-image meaning; no new API exposes preview pixels, intrinsic dimensions, or decode results. Network information follows [ordinary image-request protections](#24-how-does-the-feature-deal-with-sensitive-information).

## 2.3. Does the feature expose personal information or PII?

The API exposes no new personal information. Like other images, previews can contain personal information and disclose request metadata to their hosting origin.

## 2.4. How does the feature deal with sensitive information?

The feature does not inspect or classify image content. Preview pixels are unavailable through `drawImage()`, `createImageBitmap()`, or other image-extraction APIs.

URL previews inherit the host `<img>`'s [fetch protections](explainer.md#fetching-scheduling-and-html-integration), including CORS, credentials, referrer policy, CSP, mixed-content rules, cache partitioning, and service-worker handling. These apply even to declarations on `<source>`; unselected sources and candidates make no preview requests.

Resource Timing follows existing same-origin and `Timing-Allow-Origin` restrictions.

## 2.5. Does exposed data carry related but distinct information that may not be obvious?

Yes. The preview server receives request metadata even when the main image is hosted elsewhere. Resource Timing can expose request and transfer information under [normal protections](#24-how-does-the-feature-deal-with-sensitive-information), but not preview decoding, display, or replacement.

The browser may skip or abandon a preview under resource-saving policies. The API does not report why, although network information can reveal whether a request occurred.

## 2.6. Does the feature introduce state that persists across browsing sessions?

No new persistent state is introduced. Preview responses can use the existing HTTP cache, subject to the same cache partitioning and clearing behavior as other image responses.

## 2.7. Does the feature expose information about the underlying platform?

Yes. Property detection reveals support for `preview` and `previewset`, not for individual compact formats.

Candidate selection can reveal format support indirectly. Rejecting an unsupported compact value may trigger a URL fallback request, observable through Resource Timing or by the server.

## 2.8. Does the specification allow an origin to send data to the underlying platform?

Yes. Authors supply URLs, colors, and encoded preview data for the browser to process. Invalid or unsupported values are never reinterpreted as URLs.

Compact-format specifications must define input, dimension, memory, and processing limits and prohibit nested requests. Colors need no decoder; style-dependent values such as `var()` and `currentColor` are excluded.

## 2.9. Does the feature enable access to device sensors?

No.

## 2.10. Does the feature enable new script execution or loading mechanisms?

No. Preview content cannot execute script. Author-provided decoders are a considered alternative, not part of the API.

## 2.11. Does the feature allow an origin to access other devices?

No. It can make ordinary image requests to network origins under existing web security rules, but it adds no device-discovery or device-access capability.

## 2.12. Does the feature allow control over browser-native UI?

No. It changes page image rendering, not browser-native UI.

## 2.13. What temporary identifiers does the feature create or expose?

None. Internal image-generation identifiers used to reject obsolete work are not exposed to the page.

## 2.14. How does behavior differ between first-party and third-party contexts?

The API adds no first-party/third-party distinction. Requests follow the [image-fetch protections](#24-how-does-the-feature-deal-with-sensitive-information) applicable to their context.

## 2.15. How does the feature work in Private Browsing or Incognito mode?

Preview requests and cached responses follow existing private-browsing isolation and data-lifetime rules. The feature adds no persistent state or special private-mode behavior.

## 2.16. Does the specification have Security Considerations and Privacy Considerations?

Yes. The explainer contains separate [Privacy](explainer.md#privacy) and [Security](explainer.md#security) subsections.

## 2.17. Can origins downgrade default security protections?

No. URL previews cannot bypass the host image's [fetch protections](#24-how-does-the-feature-deal-with-sensitive-information).

Literal colors and compact data are inline author data, so they do not trigger `img-src` request checks. They cannot execute script or load nested resources. Processing is bounded, and compact-format bindings require separate security review.

## 2.18. What happens when a document using the feature enters and leaves BFCache?

Painted and decoded state may be preserved as for ordinary images.

On restoration, reevaluate selection if conditions changed and ignore stale results. A preview from an old branch cannot newly replace current content, even if the main-image URL is unchanged.

## 2.19. What happens when an element using the feature is disconnected?

Preview work becomes obsolete when ordinary HTML rules no longer require the disconnected element's image request. The browser must be able to stop obsolete decoding.

Reconnection runs normal image-data updates. Stale preview or main-image results cannot replace current content.

## 2.20. Does the specification define new errors?

The proposal adds no DOM exceptions or preview-specific `load`/`error` events. Setters reflect strings even when their syntax is invalid. After candidate selection, fetch or decode failure makes the preview unavailable without retrying other candidates or changing the main image. Existing `load`, `error`, and `decode()` behavior is unchanged.

If the main image fails, remove the preview and use normal broken-image and alt-text rendering. Developer tools may distinguish preview failures; page script gets no dedicated failure signal.

## 2.21. Can sites learn whether the user uses assistive technology?

No. The preview and main image share one accessibility node and one `alt` value.

## 2.22. What should this questionnaire have asked?

For features that add an auxiliary resource for existing content:

- Can the additional request delay the primary resource through bandwidth or priority contention?
- Can differences between auxiliary-resource cache hits, decoding support, and failures create new timing or fingerprinting signals?
- When should auxiliary fetching and decoding be canceled as the document or primary resource state changes?

The explainer addresses these under [Fetching and scheduling](explainer.md#fetching-scheduling-and-html-integration), [Privacy](explainer.md#privacy), and [Source updates](explainer.md#source-updates-and-image-generations).
