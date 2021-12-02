### Questions from https://www.w3.org/TR/security-privacy-questionnaire/

## 2. Questions to Consider

### 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

This feature introduces custom clipboard formats with unsanitized content that will be exposed to both native apps and websites. Websites or native apps need to explicitly opt-in to consume these formats which will mitigate the concerns about remote code execution in legacy apps. The existing Web Platform has an API that supports the most popular standardized data types (text, image, rich text) across all platforms. However, it does not scale to the long tail of specialized formats. In particular, custom formats, non-web-standard formats like TIFF (a large image format), and proprietary formats like .docx (a document format), are not supported by the current Web Platform. Pickling for Async Clipboard API aims to provide a solution to this problem, by letting web applications read and write custom, unsanitized, web-originated payloads using a standardized pickling format.

### 2.2. Is this specification exposing the minimum amount of information necessary to power the feature?

Yes, this information is necessary to enable the native apps to communicate with the websites through clipboard copy-paste and vice versa. Thus, providing a much better paste experience on the web for contents with complex formatting info such as Excel tables, MS Word formatting, Figma content etc.

### 2.3. How does this specification deal with personal information or personally-identifiable information or information derived thereof?

Through the custom clipboard formats, PII may be transferable from web to native apps or vice versa. However, the content in the custom format is less visible/obvious to the users. This is also true for the existing DataTransfer APIs that expose unsanitized HTML content in the standard HTML format(via setData/getData methods), but there may be metadata present in the custom format that wouldn't be typically included in the HTML format. The parsing rules for the custom format content and what data is included in the format, have to be defined by the native and web apps that read/write this format, so that alleviates some privacy concerns regarding who can read the sensitive data (if present) in the custom formats.
This feature also adds a user gesture requirement on top of existing async clipboard API security measures.  More details are [available here](https://github.com/w3c/editing/blob/gh-pages/docs/clipboard-pickling/explainer.md#user-gesture-requirement) in the explainer.

### 2.4. How does this specification deal with sensitive information?

Same as PII.

### 2.5. Does this specification introduce new state for an origin that persists across browsing sessions?

By design the contents of the clipboard do persist across browsing sessions until the user overwrites the content by copying from another application.  There is no long term persistence or ability to read without permission or user gestures, however, that would allow reliable user tracking to be implemented based on the contents of the clipboard.

### 2.6. What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?

As native applications adopt pickled format names to increase their level of interop with the web, sites that are given permission to read the clipboard will see formats that might help reveal what application the user copied content from.

### 2.7. Does this specification allow an origin access to sensors on a user’s device

No.

### 2.8. What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.

Unsanitized data that authors have put on the clipboard will be exposed to sites that have been granted permission to read the clipboard. 
Custom formats are currently supported by all major browsers, but not in a standardized way.  This proposal is standardizing the way the content is represented on the clipboard to increase interop between browser implementations, in addition to introducing a mechanism so that well known formats like HTML can simultaneously exist as a custom format and a sanitized format.

### 2.9. Does this specification enable new script execution/loading mechanisms?

No.

### 2.10. Does this specification allow an origin to access other devices?

No.

### 2.11. Does this specification allow an origin some measure of control over a user agent’s native UI?

No.

### 2.12. What temporary identifiers might this specification create or expose to the web?

None.

### 2.13. How does this specification distinguish between behavior in first-party and third-party contexts?

It follows the same access restrictions as any other Async clipboard APIs: such as focused document, permission prompts. User activation is added as a requirement.

### 2.14. How does this specification work in the context of a user agent’s Private \ Browsing or "incognito" mode?

Pickling Clipboard APIs should work the same way in incognito mode.

### 2.15. Does this specification have a "Security Considerations" and "Privacy Considerations" section?

Yes. Security Considerations are [here](https://www.w3.org/TR/clipboard-apis/#security), and Privacy Considerations are [here](https://www.w3.org/TR/clipboard-apis/#privacy).

### 2.16. Does this specification allow downgrading default security characteristics?

No.

## 3. Threat Models

### 3.1. Passive Network Attackers

No new information visible to a passive network attacker is exposed by custom pickled clipboard formats.

### 3.2. Active Network Attackers

The API is only available from a secure context.

### 3.3. Same-Origin Policy Violations

The data present in the clipboard can be accessed by any origin, but it must adhere to the existing security restrictions of the async clipboard APIs which involves user activation, active document requirement, permission granted explicitly by the user etc.

### 3.4. Third-Party Tracking

Clipboard contents are transient and don't contain a persistent value that could be used for tracking.  Additionally, the contents of the clipboard cannot be read without permission, which also prevents sites from using clipboard content for tracking purposes.

### 3.5. Legitimate Misuse

Risk of legitimate misuse seems low given the security measures put in place and the contents of the clipboard being available because the user intends to share the data between applications.