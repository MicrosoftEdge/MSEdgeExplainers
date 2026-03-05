# OpaqueRange - Security and Privacy Review

Answers to the [W3C Security and Privacy Self-Review Questionnaire](https://www.w3.org/TR/security-privacy-questionnaire/) for the [OpaqueRange](explainer.md) proposal.

## 2.1. What information does this feature expose, and for what purposes?
`OpaqueRange` exposes bounding rectangle geometry of text spans within `<textarea>` and text-supporting `<input>` elements via `getBoundingClientRect()` and `getClientRects()`. This enables popup positioning and custom highlights. Existing workarounds (e.g. cloning into a `<div>`) already approximate the same geometric data, so this doesn't expose new classes of information beyond existing layout/geometry APIs.

## 2.2. Do features in your specification expose the minimum amount of information necessary to implement the intended functionality?
Yes, only the minimum amount of information is exposed. `startContainer`/`endContainer` return `null`, no `toString()` is provided, and mutating methods are omitted. Only `getBoundingClientRect()`, `getClientRects()`, `startOffset`, `endOffset`, and `collapsed` are exposed.

## 2.3. Do the features in your specification expose personal information, personally-identifiable information (PII), or information derived from either?
No.

## 2.4. How do the features in your specification deal with sensitive information?
`OpaqueRange` does not interact with or expose sensitive information.

## 2.5. Does data exposed by your specification carry related but distinct information that may not be obvious to users?
No.

## 2.6. Do the features in your specification introduce state that persists across browsing sessions?
No.

## 2.7. Do the features in your specification expose information about the underlying platform to origins?
No.

## 2.8. Does this specification allow an origin to send data to the underlying platform?
No.

## 2.9. Do features in this specification enable access to device sensors?
No.

## 2.10. Do features in this specification enable new script execution/loading mechanisms?
No.

## 2.11. Do features in this specification allow an origin to access other devices?
No.

## 2.12. Do features in this specification allow an origin some measure of control over a user agent's native UI?
No.

## 2.13. What temporary identifiers do the features in this specification create or expose to the web?
None.

## 2.14. How does this specification distinguish between behavior in first-party and third-party contexts?
No distinction.

## 2.15. How do the features in this specification work in the context of a browser's Private Browsing or Incognito mode?
No difference.

## 2.16. Does this specification have both "Security Considerations" and "Privacy Considerations" sections?
Yes. The [OpaqueRange explainer](explainer.md) includes [Privacy](explainer.md#privacy) and [Security](explainer.md#security) sections. No privacy or security concerns are expected.

## 2.17. Do features in your specification enable origins to downgrade default security protections?
No.

## 2.18. What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?
`OpaqueRange` objects are tied to the document and are preserved along with it in BFCache, consistent with how DOM `Range` and `StaticRange` behave.

## 2.19. What happens when a document that uses your feature gets disconnected?
`OpaqueRange` objects remain valid and retain their offsets, consistent with how DOM `Range` behaves when a document is disconnected.

## 2.20. Does your spec define when and how new kinds of errors should be raised?
Yes. `createValueRange()` throws `"NotSupportedError"` for unsupported `<input>` types and `"IndexSizeError"` for out-of-bounds offsets. These follow existing DOM error patterns (e.g. for Range) and do not expose new information.

## 2.21. Does your feature allow sites to learn about the user's use of assistive technology?
No.

## 2.22. What should this questionnaire have asked?
N/A
