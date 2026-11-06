# Security and Privacy Questionnaire for Custom Highlight API Extensions

## 2.1. What information does this feature expose, and for what purposes?

No new personal information is exposed to first or third parties. The proposal
styles document content without expanding script access to it. Built-in
highlight effects must preserve existing protections for browser search and
spellchecking state.

## 2.2. Do features in your specification expose the minimum amount of information necessary to implement the intended functionality?

Yes. No additional user information is needed for highlight styling or animation.

## 2.3. Do the features in your specification expose personal information, personally-identifiable information (PII), or information derived from either?

No.

## 2.4. How do the features in your specification deal with sensitive information?

The proposal does not collect sensitive information or change access to it.

## 2.5. Does data exposed by your specification carry related but distinct information that may not be obvious to users?

No. The proposal does not introduce user data sharing or embedded metadata.

## 2.6. Do the features in your specification introduce state that persists across browsing sessions?

No.

## 2.7. Do the features in your specification expose information about the underlying platform to origins?

No new access to hardware or user configuration is intended. Existing CSS
feature detection and animation timing remain available; protections for
platform spellchecking information must be preserved.

## 2.8. Does this specification allow an origin to send data to the underlying platform?

No new mechanism for sending data to the underlying platform is introduced.

## 2.9. Do features in this specification enable access to device sensors?

No.

## 2.10. Do features in this specification enable new script execution/loading mechanisms?

No.

## 2.11. Do features in this specification allow an origin to access other devices?

No.

## 2.12. Do features in this specification allow an origin some measure of control over a user agent's native UI?

No. It styles document content, not browser chrome or security controls.

## 2.13. What temporary identifiers do the features in this specification create or expose to the web?

None that identify users or devices.

## 2.14. How does this specification distinguish between behavior in first-party and third-party contexts?

No distinction. Existing same-origin restrictions continue to apply.

## 2.15. How do the features in this specification work in the context of a browser's Private Browsing or Incognito mode?

Behavior is unchanged in private browsing. No new state or identifiers link
normal and private sessions.

## 2.16. Does this specification have both "Security Considerations" and "Privacy Considerations" sections?

The explainer covers both in a combined considerations section.

## 2.17. Do features in your specification enable origins to downgrade default security protections?

No.

## 2.18. What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?

Highlight state is retained with the document. Effects should follow existing
CSS animation and transition lifecycle behavior during caching and restoration.

## 2.19. What happens when a document that uses your feature gets disconnected?

Effects should follow existing behavior for non-fully-active documents.
Reconnecting an iframe creates a new document without the old highlight state.

## 2.20. Does your spec define when and how new kinds of errors should be raised?

No new error types are proposed. Invalid input follows existing CSS and API
rules, without revealing private user or platform information.

## 2.21. Does your feature allow sites to learn about the user's use of assistive technology?

No. Highlight effects do not report assistive-technology use or activity.

## 2.22. What should this questionnaire have asked?

No additional questions identified.
