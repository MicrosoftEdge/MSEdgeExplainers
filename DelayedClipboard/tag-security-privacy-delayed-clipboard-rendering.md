### Questions from https://www.w3.org/TR/security-privacy-questionnaire/

## 2. Questions to Consider

### 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

For standard formats, this feature doesn't expose any information about the source and destination apps during copy-paste operation. However, for web custom formats, since it's restricted to a specific set of apps, during paste it could expose the source app where the user copied the data from. When a format is delay rendered, the system clipboard requests the data for that format during paste. The source app must provide the data for the delay rendered format when it is requested by the system clipboard, else, the paste would fail in the destination app.
For more discussion, please see https://github.com/w3c/editing/issues/439.

To use delay rendering via the async clipboard API, all the existing restrictions in async clipboard APIs related to secure context, permissions etc apply.

### 2.2. Do features in your specification expose the minimum amount of information necessary to enable their intended uses?

Yes.

### 2.3. How do the features in your specification deal with personal information, personally-identifiable information (PII), or information derived from them?

This feature doesn't expose any new information that can't already be accessed via existing DataTransfer and async clipboard APIs.

### 2.4. How do the features in your specification deal with sensitive information?

This feature doesn't deal with any sensitive information.

### 2.5. Do the features in your specification introduce new state for an origin that persists across browsing sessions?

No.

### 2.6. Do the features in your specification expose information about the underlying platform to origins?

No.

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

It doesn't distinguish between behavior in first-party and third-party contexts as the async clipboard APIs already have restrictions via Permissions.

### 2.14. How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?

It works the same way in incognito mode as the existing async clipboard APIs.

### 2.15. Does this specification have both "Security Considerations" and "Privacy Considerations" sections?

Yes. https://github.com/snianu/MSEdgeExplainers/blob/main/DelayedClipboard/DelayedClipboardRenderingExplainer.md#privacy-and-security-considerations.

### 2.16. Do features in your specification enable origins to downgrade default security protections?

No.

### 2.17. How does your feature handle non-"fully active" documents?

No interaction with documents regardless of its state. However, the document needs to have focus to trigger the existing async clipboard APIs.

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

We don't think there is any risk of legitimate misuse of this API. The privacy concern with web custom formats can be mitigated by restricting the web custom formats to a very small number so the authors can't cast a wide net to track all the supported apps. UAs could also choose to trigger the callback after a fixed/variable amount of time regardless of whether the formats were requested by the system clipboard or not. That way the authors can't determine whether the data is being requested as a result of user paste operation.