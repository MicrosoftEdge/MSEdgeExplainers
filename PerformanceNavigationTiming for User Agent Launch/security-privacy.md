Questions from https://www.w3.org/TR/security-privacy-questionnaire/

# 2. Questions to Consider

## 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

It exposes a new field on the PerformanceNavigationTiming object to allow developers to discern if the page load occured while the user agent was in a non-optimal performance state.

## 2.2. Do features in your specification expose the minimum amount of information necessary to enable their intended uses?

Yes.

## 2.3. How do the features in your specification deal with personal information, personally-identifiable information (PII), or information derived from them?

It does not deal with such information.

## 2.4. How do the features in your specification deal with sensitive information?

It does not deal with sensitive information.

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

No distinction.

## 2.14. How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?

There is a concern exposing this information in an Private Browsing window could reveal that a user opened a certain website there. For example, if the user right mouse clicks on a link and selects “Open link in Incognito/InPrivate window”. To mitigate this, the systemEntropy field will always return "normal" in Incognito/InPrivate mode.

## 2.15. Does this specification have both "Security Considerations" and "Privacy Considerations" sections?

Yes.

## 2.16. Do features in your specification enable origins to downgrade default security protections?

No.

## 2.17 How does your feature handle non-"fully active" documents?

No difference.

## 2.18 What should this questionnaire have asked?

None.

# 3. Threat Models

## 3.1 Passive Network Attackers

Not applicable

## 3.2 Active Network Attackers

Not applicable

## 3.3 Same-Origin Policy Violations

Not applicable

## 3.4 Third-Party Tracking

Not applicable

## 3.5 Legitimate Misuse

Because navigations can be script-initiated (iframes, prerenders) the entropy state will be empty for all non-top-level navigation. This avoids this value being used as a proxy for querying the system entropy in real time.
