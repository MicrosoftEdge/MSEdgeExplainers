# Self-Review Questionnaire: Security and Privacy - Platform-Provided Behaviors for Custom Elements

From [Self-Review Questionnaire: Security and Privacy](https://www.w3.org/TR/security-privacy-questionnaire/).

## 2.1. What information does this feature expose, and for what purposes?

This feature doen't expose new information to websites. It provides a mechanism for custom elements to adopt native HTML element behaviors (starting with form submission via `HTMLSubmitButtonBehavior`) through the existing `attachInternals()` API. Behaviors expose properties that mirror those already available on native elements like `<button>` (e.g., `disabled`, `formAction`, `form`, `labels`), and these properties only reflect state that the developer explicitly sets or that is already accessible through `ElementInternals`.

## 2.2. Do features in your specification expose the minimum amount of information necessary to implement the intended functionality?

Yes. The feature exposes only the behavior instances that the developer explicitly created and attached. The `behaviors` property is a read-only `FrozenArray` that reflects what was passed to `attachInternals()`.

## 2.3. Do the features in your specification expose personal information, personally-identifiable information (PII), or information derived from either?

No.

## 2.4. How do the features in your specification deal with sensitive information?

This feature doesn't deal with sensitive information. Form data submitted through `HTMLSubmitButtonBehavior` follows the same submission pipeline as native `<button type="submit">` elements, subject to the same security policies (CSP, navigation checks, HTTPS requirements).

## 2.5. Does data exposed by your specification carry related but distinct information that may not be obvious to users?

No.

## 2.6. Do the features in your specification introduce state that persists across browsing sessions?

No.

## 2.7. Do the features in your specification expose information about the underlying platform to origins?

No. The availability of `HTMLSubmitButtonBehavior` as a global constructor is detectable via feature detection, like any new web platform API.

## 2.8. Does this specification allow an origin to send data to the underlying platform?

Not beyond what is already possible. Form submission triggered by `HTMLSubmitButtonBehavior` uses the same `FormSubmission` infrastructure as native form controls.

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

Yes. The [explainer](explainer.md) includes [security](explainer.md#security) and [privacy](explainer.md#privacy) sections.

## 2.17. Do features in your specification enable origins to downgrade default security protections?

No. Form submission through behaviors is subject to the same CSP, CORS, navigation, and validation checks as native form submission.

## 2.18. What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?

Behavior instances are tied to `ElementInternals`, which is tied to the custom element, which is tied to the document. When a document enters BFCache, behavior state is preserved along with the rest of the document state. When the document is restored, behaviors resume functioning.

## 2.19. What happens when a document that uses your feature gets disconnected?

When a custom element with behaviors is disconnected from the DOM, the behavior state is preserved. Event handlers remain attached but inactive since the element is not in the document. Form submission is a no-op because `Form()` returns null for disconnected elements.

## 2.20. Does your spec define when and how new kinds of errors should be raised?

Yes. `TypeError` is thrown when duplicate behavior instances are provided, when multiple instances of the same behavior type are attached, or when an already-attached behavior instance is reused on another element.

## 2.21. Does your feature allow sites to learn about the user's use of assistive technology?

No. The feature provides implicit ARIA roles (`role="button"` for `HTMLSubmitButtonBehavior`) and focusability, set by the developer through behavior attachment.

## 2.22. What should this questionnaire have asked?

N/A
