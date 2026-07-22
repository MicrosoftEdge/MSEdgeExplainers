# Self-Review Questionnaire: Security and Privacy - Platform-Provided Behaviors for Custom Elements

From [Self-Review Questionnaire: Security and Privacy](https://www.w3.org/TR/security-privacy-questionnaire/).

## 2.1. What information does this feature expose, and for what purposes?

This feature doesn't expose new information to websites. It provides a mechanism for custom elements to adopt native HTML element behaviors (starting with native `<button>` behavior via `HTMLButtonBehavior`) through the existing `attachInternals()` API. Behaviors expose properties that mirror those already available on native elements like `<button>` (e.g., `type`, `disabled`, `formAction`, `form`, `labels`), and these properties only reflect state that the web author explicitly sets or that is already accessible through `ElementInternals`.

## 2.2. Do features in your specification expose the minimum amount of information necessary to implement the intended functionality?

Yes. The feature exposes only the behaviors the element declares in its `static behaviors` property. `ElementInternals.behaviors` is a read-only collection keyed by behavior class that reflects those declared behaviors.

## 2.3. Do the features in your specification expose personal information, personally-identifiable information (PII), or information derived from either?

No.

## 2.4. How do the features in your specification deal with sensitive information?

This feature doesn't deal with sensitive information. Form submission triggered by `HTMLButtonBehavior` (when `type` is `submit`) follows the same submission pipeline as native `<button type="submit">`, subject to the same security policies (CSP, navigation checks, HTTPS requirements). Form reset (when `type` is `reset`) resets the form's controls to their defaults entirely on the client and sends no data. Generic-button mode (`type` is `button`) submits no form data; it can invoke a popover or command through the same `commandfor`/`popovertarget` mechanism already available to native `<button>`.

## 2.5. Does data exposed by your specification carry related but distinct information that may not be obvious to users?

No.

## 2.6. Do the features in your specification introduce state that persists across browsing sessions?

No.

## 2.7. Do the features in your specification expose information about the underlying platform to origins?

No. The availability of `HTMLButtonBehavior` as a global constructor is detectable via feature detection, like any new web platform API.

## 2.8. Does this specification allow an origin to send data to the underlying platform?

Not beyond what is already possible. Form submission triggered by `HTMLButtonBehavior` (`type="submit"`) uses the same `FormSubmission` infrastructure as native form controls. The reset and generic-button modes send no data to the server.

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

No. Submission, reset, and invoker actions through `HTMLButtonBehavior` are subject to the same CSP, CORS, navigation, and validation checks as their native `<button>` counterparts.

## 2.18. What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?

Behavior instances are tied to `ElementInternals`, which is tied to the custom element, which is tied to the document. When a document enters BFCache, behavior state is preserved along with the rest of the document state. When the document is restored, behaviors resume functioning.

## 2.19. What happens when a document that uses your feature gets disconnected?

When a custom element with behaviors is disconnected from the DOM, the behavior state is preserved. Event handlers still fire on the host, but activation is a no-op because a disconnected element has no form owner (when `type` is `submit` or `reset`).

## 2.20. Does your spec define when and how new kinds of errors should be raised?

Yes. A `TypeError` is thrown at `customElements.define()` time when `static behaviors` lists two behaviors in the same category or lists the same behavior class twice. Constructing a platform behavior directly (for example, `new HTMLButtonBehavior()`) throws a `TypeError` ("Illegal constructor"), since behaviors are instantiated by the platform.

## 2.21. Does your feature allow sites to learn about the user's use of assistive technology?

No.

## 2.22. What should this questionnaire have asked?

N/A
