# [Self-Review Questionnaire: Security and Privacy](https://w3ctag.github.io/security-questionnaire/)

## Questions to Consider:
### 1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?
Pen Events will expose no new information to the site other than the occurrence of the event itself.
### 2. Is this specification exposing the minimum amount of information necessary to power the feature?
Yes.
### 3. How does this specification deal with personal information or personally-identifiable information or information derived thereof?
Pen Events do not expose or consume personal information.
### 4. How does this specification deal with sensitive information?
Pen Events do not expose or consume sensitive information.
### 5. Does this specification introduce new state for an origin that persists across browsing sessions?
No.
### 6. What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?
Even though Pen Events are exposed through the Window in all platforms, receiving such event would mean that the underlying platform is one that supports these pen event interactions.
### 7. Does this specification allow an origin access to sensors on a user’s device?
No.
### 8. What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.
Pen Events will expose no new information to the origin other than the occurrence of the event itself.
### 9. Does this specification enable new script execution/loading mechanisms?
No.
### 10. Does this specification allow an origin to access other devices?
No.
### 11. Does this specification allow an origin some measure of control over a user agent's native UI?
No.
### 12. What temporary identifiers might this specification create or expose to the web?
None.
### 13. How does this specification distinguish between behavior in first-party and third-party contexts?
Pen Events do not distinguish between behavior in first-party and third-party contexts.
### 14. How does this specification work in the context of a user agent’s Private Browsing or "incognito" mode?
Pen Events work the same in and out of private browsing mode.
### 15. Does this specification have a "Security Considerations" and "Privacy Considerations" section?
No.
### 16. Does this specification allow downgrading default security characteristics?
No.

## Threat Models:
### 1. Passive Network Attackers
Pen Events do not require network activity.
### 2. Active Network Attackers
Pen Events do not require network activity.
### 3. Same-Origin Policy Violations
Existing policies protect Pen Events from different origins.
### 4. Third-Party Tracking
Relative to Pointer Events, no new information is exposed to the web by this specification that could be used for fingerprinting or tracking users.
### 5. Legitimate Misuse
In Windows, adding an event listener for a Pen Event overrides Shell’s default behavior. Malicious sites could add no-op event listeners to prevent that default behavior without users’ knowledge. For this to happen, the site’s window needs to be active and focused. 
