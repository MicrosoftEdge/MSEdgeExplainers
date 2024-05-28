### Questions from https://www.w3.org/TR/security-privacy-questionnaire/

# 2. Questions to Consider
## 2.1. What information does this feature expose, and for what purposes?
This feature exposes JavaScript call stacks at the time of a crash to website developers. This information is necessary for diagnosing and resolving issues that may cause a page to become unresponsive due to JavaScript execution.
## 2.2. Do features in your specification expose the minimum amount of information necessary to implement the intended functionality?
Yes, the feature is designed to include JavaScript call stacks and only when developers opt-in to receive them.
## 2.3. Do the features in your specification expose personal information, personally-identifiable information (PII), or information derived from either?
No, this feature only includes JavaScript call stacks at the time of the crash.
## 2.4. How do the features in your specification deal with sensitive information?
The feature does not deal with sensitive information.
## 2.5. Do the features in your specification introduce state that persists across browsing sessions?
No, the feature does not introduce new persistent state for an origin. It only reports the JavaScript call stacks at the time of a crash, which does not persist across sessions.
## 2.6. Do the features in your specification expose information about the underlying platform to origins?
No, the feature does not expose any information about the underlying platform.
## 2.7. Does this specification allow an origin to send data to the underlying platform?
No, the feature does not allow an origin to send data to the underlying platform.
## 2.8. Do features in this specification enable access to device sensors?
No, the feature does not enable access to device sensors.
## 2.9. Do features in this specification enable new script execution/loading mechanisms?
No, the feature does not enable new script execution/loading mechanisms.
## 2.10. Do features in this specification allow an origin to access other devices?
No, the feature does not allow an origin to access other devices.
## 2.11. Do features in this specification allow an origin some measure of control over a user agent’s native UI?
No, the feature does not allow an origin to control the user agent's native UI.
## 2.12. What temporary identifiers do the features in this specification create or expose to the web?
The feature does not create or expose any temporary identifiers to the web.
## 2.13. How does this specification distinguish between behavior in first-party and third-party contexts?
The feature behaves the same in both first-party and third-party contexts. However, third-party scripts are included in the call stack only if they are loaded with CORS headers.
## 2.14. How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?
The feature should function the same way in Private Browsing or Incognito mode as it does in normal browsing mode.
## 2.15. Does this specification have both "Security Considerations" and "Privacy Considerations" sections?
Yes, the specification has both "Security Considerations" and "Privacy Considerations" sections.
## 2.16. Do features in your specification enable origins to downgrade default security protections?
No, the feature does not enable origins to downgrade default security protections.
## 2.17 What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?
The feature should handle documents in the BFCache the same way as "fully active" ones, including their call stacks in crash reports if they get reused on future navigations back to the document.
## 2.18. What happens when a document that uses your feature gets disconnected?
If a document using this feature gets disconnected, the feature should still function. The generation of the crash report, including the JavaScript call stack, does not rely on the document being connected. However, the delivery of the crash report would be affected by the document's network status.
## 2.19. What should this questionnaire have asked?
N/A