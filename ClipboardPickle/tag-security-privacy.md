### Questions from https://www.w3.org/TR/security-privacy-questionnaire/

## 2. Questions to Consider

Generally, note that secure contexts, focused frames, and user permissions are required to access this feature.

### 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

This feature introduces custom clipboard formats with unsanitized content that will be exposed to both native apps and websites. The proposal states that websites
or native apps need to explicitly opt-in to consume these formats which will mitigate the concerns about remote code execution in legacy apps.
The existing Web Platform has an API that supports the most popular standardized data types (text, image, rich text) across all platforms. However, it does not scale to the long tail of specialized formats. In particular, custom formats, non-web-standard formats like TIFF (a large image format), and proprietary formats like .docx (a document format), are not supported by the current Web Platform. Pickling for Async Clipboard API aims to provide a solution to this problem, by letting web applications read and write custom, unsanitized, web-originated payloads using a standardized pickling format.

### 2.2. Is this specification exposing the minimum amount of information necessary to power the feature?

Yes, this information is necessary to enable the native apps to communicate with the websites through clipboard copy-paste and vice-versa. Thus providing a much better paste experience on the web for contents with complex formatting info such as Excel tables, MS Word formatting, Figma content etc.

### 2.3. How does this specification deal with personal information or personally-identifiable information or information derived thereof?

Through the custom clipboard formats, PII may be transferable from web to native apps or vice-versa. Currently copy-paste operation does expose highly sensitive PII such as SSN, DOB, passwords etc and this feature doesn't expose anything new. Moreover, this feature also has additional security mitigations in the form of permission prompts that is already available for Async clipboard apis, user gesture requirement, document should be focused etc.

### 2.4. How does this specification deal with sensitive information?

Same as PII.

### 2.5. Does this specification introduce new state for an origin that persists across browsing sessions?

The custom clipboard formats copied into the clipboard do persist across browsing sessions. However, additional security measures such as user gesture requirement, permission prompt to access clipboard data, focused frame etc mitigates lot of security issues.

### 2.6. What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?

Custom formats and unsanitized content from the clipboard are exposed which could lead to fingerprinting, but the security restrictions discussed in PII should be able to mitigate some of the concerns. From the clipboard data, it could be possible to infer a potential range of operating system versions given the types available after a write, for platforms which convert clipboard types implicitly ([example](https://docs.microsoft.com/en-us/windows/win32/dataxchg/clipboard-formats#synthesized-clipboard-formats)) and given that the platform’s mappings change. Platform clipboard implicit mappings do not change often, so this platform information is only speculatively possible to fingerprint. This should not be much information, but in combination with navigator.userAgent, could help fingerprint a user with more precision. That said, this is significantly less powerful or useful than navigator.userAgent, and requires a permission to trigger, so should be relatively safe. This is consistent across origins.

### 2.7. Does this specification allow an origin access to sensors on a user’s device

No.

### 2.8. What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.

No data is exposed to other origins without (1) a copy/write in one origin, (2) a user clicking into another origin to make it the focused frame, (3) a user allowing a permission prompt to paste/read, and (4) a paste/read in the other origin. See 2.1 for data exposed in this instance.


### 2.9. Does this specification enable new script execution/loading mechanisms?

It is possible as the custom formats have unsanitized content. However the native apps/websites need to explicitly opt-in to access this data from the clipboard. We also have additional security mitigations in-place for this feature as discussed in PII data section.

### 2.10. Does this specification allow an origin to access other devices?

No.

### 2.11. Does this specification allow an origin some measure of control over a user agent’s native UI?

No.

### 2.12. What temporary identifiers might this this specification create or expose to the web?

None.

### 2.13. How does this specification distinguish between behavior in first-party and third-party contexts?

It follows the same access restrictions as any other Async clipboard APIs such as focused document, user activation, permission prompts etc.

### 2.14. How does this specification work in the context of a user agent’s Private \ Browsing or "incognito" mode?

Pickling Clipboard APIs should work the same way in incognito mode.

### 2.15. Does this specification have a "Security Considerations" and "Privacy Considerations" section?

Yes. Security Considerations are [here](https://www.w3.org/TR/clipboard-apis/#security), and Privacy Considerations are [here](https://www.w3.org/TR/clipboard-apis/#privacy).

### 2.16. Does this specification allow downgrading default security characteristics?

No.

### 2.17. What should this questionnaire have asked?

#### 2.17.1. How might this specification compromise a user's system? ([issue](https://github.com/dway123/raw-clipboard-access/issues/3))

Exposing raw clipboard content to the open web platform poses serious security issues, in that this introduces a large surface of unsanitized content, previously not available to the open web.

There are known security vulnerabilities in native applications' decoders. These decoders are often run when contents are pasted into such applications, and these vulnerabilities may allow for remote code execution with all the priviledges granted to the native application.

Example: A malicious web application may write an image with a payload designed to take advantage of insecure decoders. As raw clipboard access does not specify sanitization of clipboard contents prior to write, this will be written exactly as delivered by the web application. This malicious image might then be pasted into an application with an insecure decoder. When the user pastes into this application, the image will be decoded, and remote code execution outside of the sandboxed browser may occur. 

A permission prompt is in place for writes to ensure that the user takes care when allowing raw clipboard access. User agents should make the risks of granting the permission clear to users. In addition, as with the underlying Clipboard API, secure context and focused frame are required, and this API's asynchronous nature allows for various checks, like Safe Browsing or similar, to be performed, so that user agents can properly guarantee the security of their users.

## 3. Threat Models

### 3.1. Passive Network Attackers

No new information visible to a passive network attacker is exposed by custom pickled clipboard formats.

### 3.2. Active Network Attackers

Security measures discussed in PII data would mitigate lot of the concerns around network attackers. This feature is opt-in and has all the restrictions that is applicable to Async clipboard apis.

### 3.3. Same-Origin Policy Violations

The data present in the clipboard can be accessed by any origin, but it has to adhere to the existing security restrictions of the async clipboard APIs which involves user activation, active document requirement, permission granted explicitly by the user etc.

### 3.4. Third-Party Tracking

This should not be affected by third-party tracking, unless a custom clipboard type were to be used to attempt to track user behavior. However, is already more possible and powerful to do through cookies. See 3.5 Legitimate Misuse for more information.

### 3.5. Legitimate Misuse

It is possible that a Web or Native application sends information the user did not intend to expose, through a custom clipboard type that is not expected to be used. While it is already possible to transmit data a user may not intend to transmit via text/plain and other standardized types, or via steganography in an image, this would provide another avenue to hide information on a platform clipboard.