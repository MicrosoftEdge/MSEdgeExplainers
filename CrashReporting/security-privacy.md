### Questions from https://www.w3.org/TR/security-privacy-questionnaire/

# 2. Questions to Consider
## 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?
This feature exposes JavaScript call stacks at the time of a crash to website developers. This information is necessary for diagnosing and resolving issues that may cause a page to become unresponsive due to JavaScript execution.
## 2.2. Do features in your specification expose the minimum amount of information necessary to enable their intended uses?
Yes, the feature is designed to include JavaScript call stacks and only when developers opt-in to receive them.
## 2.3. How do the features in your specification deal with personal information, personally-identifiable information (PII), or information derived from them?
This feature does not expose any personal or personally identifiable information. It only includes JavaScript call stacks at the time of the crash.
## 2.4. How do the features in your specification deal with sensitive information?
The feature does not deal with sensitive information.
## 2.5. Do the features in your specification introduce new state for an origin that persists across browsing sessions?
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
## 2.17 How does your feature handle non-"fully active" documents?
The JavaScript call stack is only collected for visible tabs, such as the current active page the user is on. Therefore, non-"fully active" documents, such as those in the background or in the BFCache, will not trigger the javascript call stack collection unless they become active and then deemed unresponsive.
## 2.18. What should this questionnaire have asked?
N/A