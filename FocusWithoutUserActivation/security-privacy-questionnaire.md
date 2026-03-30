# Security & Privacy Self-Review Questionnaire: Permissions Policy \`focus-without-user-activation\`

This document answers the W3C **[Self-Review Questionnaire: Security and Privacy](https://www.w3.org/TR/security-privacy-questionnaire/)** for the **Permissions Policy: `focus-without-user-activation`** feature (see [explainer](explainer.md) for more information).

### 2.1 What information does this feature expose, and for what purposes?

This Permissions Policy primarily changes whether programmatic focus operations are allowed for embedded browsing contexts. The exposure to web authors is behavioral: scripts can observe whether focus attempts succeed or fail under the policy's rules. The purpose is to prevent disruptive focus stealing (especially for keyboard users) while preserving legitimate focus management when the frame is already in use.

### 2.2 Do features in your specification expose the minimum amount of information necessary to implement the intended functionality?

Yes.

### 2.3 Do the features in your specification expose personal information, personally-identifiable information (PII), or information derived from either?

No.

### 2.4 How do the features in your specification deal with sensitive information?

The feature does not expose or process sensitive information.

### 2.5 Does data exposed by your specification carry related but distinct information that may not be obvious to users?

No.

### 2.6 Do the features in your specification introduce state that persists across browsing sessions?

No new persistent state is introduced by this feature. The Permissions Policy configuration is evaluated at runtime to decide whether focus operations are allowed.

### 2.7 Do the features in your specification expose information about the underlying platform to origins?

No.

### 2.8 Does this specification allow an origin to send data to the underlying platform?

No.

### 2.9 Do features in this specification enable access to device sensors?

No.

### 2.10 Do features in this specification enable new script execution/loading mechanisms?

No.

### 2.11 Do features in this specification allow an origin to access other devices?

No.

### 2.12 Do features in this specification allow an origin some measure of control over a user agent's native UI?

Not beyond existing web focus behavior. The feature controls whether web content may programmatically move focus in certain embedding scenarios, it does not add new control over the user agent's native UI surfaces.

### 2.13 What temporary identifiers do the features in this specification create or expose to the web?

None.

### 2.14 How does this specification distinguish between behavior in first-party and third-party contexts?

This feature is specifically designed for embedding scenarios and can restrict programmatic focus in cross-origin iframes unless the policy delegates that capability. In other words, it gives embedders control over whether third-party embedded content can move focus away from the embedding context.

### 2.15 How do the features in this specification work in the context of a browser's Private Browsing or Incognito mode?

No special behavior is defined.

### 2.16 Does this specification have both "Security Considerations" and "Privacy Considerations" sections?

The explainer doesn't have explicit sections for these as there are no anticipated security or privacy concerns for it.

### 2.17 Do features in your specification enable origins to downgrade default security protections?

No.

### 2.18 What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?

No additional BFCache-specific behavior is defined by this feature.

### 2.19 What happens when a document that uses your feature gets disconnected?

No new behavior is defined beyond existing document lifecycle handling. The policy should continue to apply whenever the document is active and executing.

### 2.20 Does your spec define when and how new kinds of errors should be raised?

No new error types are defined by this feature. Focus attempts that are not allowed are expected to behave consistently with existing focus API failure behavior.

### 2.21 Does your feature allow sites to learn about the user's use of assistive technology?

No.

### 2.22 What should this questionnaire have asked?

N/A.