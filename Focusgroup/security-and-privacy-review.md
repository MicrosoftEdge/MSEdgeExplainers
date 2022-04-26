# Focusgroup - Security and privacy review
## 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?
No additional information will be exposed to Web sites or other partis by this feature.

## 2.2. Do features in your specification expose the minimum amount of information necessary to enable their intended uses?
Yes. As mentioned in the previous point, no information gets exposed through this feature.

## 2.3. How do the features in your specification deal with personal information, personally-identifiable information (PII), or information derived from them?
The features in our specification **do not** rely on any type of personal information, PII or information derived from them.

## 2.4. How do the features in your specification deal with sensitive information?
The Focusgroup feature is oblivious of the content it interacts with and doesn't share any of it. All data, including sensitive information, remains unaffected by our feature. No data is shared.

## 2.5. Do the features in your specification introduce new state for an origin that persists across browsing sessions?
No.

## 2.6. Do the features in your specification expose information about the underlying platform to origins?
No.

## 2.7. Does this specification allow an origin to send data to the underlying platform?
No.

## 2.8. Do features in this specification enable access to device sensors?
No.

## 2.9. Do features in this specification enable new script execution/loading mechanisms?
No.

## 2.10. Do features in this specification allow an origin to access other devices?
No.

## 2.11. Do features in this specification allow an origin some measure of control over a user agent’s native UI?
No.

## 2.12. What temporary identifiers do the features in this specification create or expose to the web?
None.

## 2.13. How does this specification distinguish between behavior in first-party and third-party contexts?
N/A

## 2.14. How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?
This feature doesn't access user data, so it works the same way in Private Browsing/Incognito mode as it does in "normal" mode.

## 2.15. Does this specification have both "Security Considerations" and "Privacy Considerations" sections?
It does have such a section, but no considerable privacy or security concerns are expected. We welcome community feedback.

## 2.16. Do features in your specification enable origins to downgrade default security protections?
No.

## 2.17. How does your feature handle non-"fully active" documents?
It's possible that if the last focused element is stored in the non-fully active state, the focusgroup feature will be able to start navigating from that last focused element. This won't lead to security or privacy concerns.

## 2.18. What should this questionnaire have asked?
Nothing more regarding this particular feature. Thanks for the template!
