Questions from https://www.w3.org/TR/security-privacy-questionnaire/

# 2. Questions to Consider

## 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

It exposes a new field on the PerformanceNavigationTiming object to allow developers to discern if the navigation timings are representative for their web application.

## 2.2. Do features in your specification expose the minimum amount of information necessary to enable their intended uses?

Yes.

## 2.3. How do the features in your specification deal with personal information, personally-identifiable information (PII), or information derived from them?

It does not deal with such information.

## 2.4. How do the features in your specification deal with sensitive information?

It does not deal with sensitive information.

## 2.5. Do the features in your specification introduce new state for an origin that persists across browsing sessions?

No.

## 2.6. Do the features in your specification expose information about the underlying platform to origins?

This API coalesces multiple pieces of information into a single value. Sites might attempt to
infer on a specific dimension. For example, this value could be coupled with the results of AdBlocker detection scripts to infer that more extensions are installed. However, this does not expose any other information about the extensions that maybe installed. Due to the noise added into this new field, this inference suffers from significant false positives.

An analysis of fingerprinting capability provided by this surface suggests fairly limited impact.

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

No distinction.

There is a concern that exposing this information in an Private Browsing window, because it could indicate that a user visited a specific website there, since extensions are usually off by default in Private Browsing mode (thus eliminating one contributing factor). However, this inference is not reliable, because a 'low' confidence result can have many causes, and the result has noise added to it.

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

Not applicable
