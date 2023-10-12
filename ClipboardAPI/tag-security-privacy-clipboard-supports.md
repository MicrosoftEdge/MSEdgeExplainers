### Questions from https://www.w3.org/TR/security-privacy-questionnaire/

## 2. Questions to Consider

### 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

The `supports` API detects whether a clipboard format type is supported or not. It doesn't interact with the system clipboard. It returns true if a Browser supports a clipboard format type, else, false.

### 2.2. Do features in your specification expose the minimum amount of information necessary to enable their intended uses?

Yes.

### 2.3. How do the features in your specification deal with personal information, personally-identifiable information (PII), or information derived from them?

No PII or any information derived from them is exposed via this API.

### 2.4. How do the features in your specification deal with sensitive information?

This feature doesn't deal with any sensitive information.

### 2.5. Do the features in your specification introduce new state for an origin that persists across browsing sessions?

The API detects the clipboard format types that are supported by the Browser. It is a static information so it persists across browsing sessions. However, it doesn't interact with the system clipboard, nor does it expose any data from the clipboard.

### 2.6. Do the features in your specification expose information about the underlying platform to origins?

It doesn't expose information about the underlying platform.

### 2.7. Does this specification allow an origin to send data to the underlying platform?

No.

### 2.8. Do features in this specification enable access to device sensors?

No.

### 2.9. Do features in this specification enable new script execution/loading mechanisms?

No.

### 2.10. Do features in this specification allow an origin to access other devices?

No.

### 2.11. Do features in this specification allow an origin some measure of control over a user agent’s native UI?

No.

### 2.12. What temporary identifiers do the features in this specification create or expose to the web?

None.

### 2.13. How does this specification distinguish between behavior in first-party and third-party contexts?

It doesn't distinguish between behavior in first-party and third-party contexts as it's a static information about supported clipboard format types.

### 2.14. How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?

It works the same way in incognito mode.

### 2.15. Does this specification have both "Security Considerations" and "Privacy Considerations" sections?

N/A.

### 2.16. Do features in your specification enable origins to downgrade default security protections?

No.

### 2.17. How does your feature handle non-"fully active" documents?

No interaction with documents regardless of its state.

### 2.18. What should this questionnaire have asked?

N/A

## 3. Threat Models

### 3.1. Passive Network Attackers

No threat.

### 3.2. Active Network Attackers

The API is only available from a secure context.

### 3.3. Same-Origin Policy Violations

It doesn't leak data across origins.

### 3.4. Third-Party Tracking

No interaction with third-party pages.

### 3.5. Legitimate Misuse

We don't think there is any risk of legitimate misuse of this API.
