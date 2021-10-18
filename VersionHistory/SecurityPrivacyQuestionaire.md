(As authored originally by @stanleyhon)

This has been created by cut-and-paste from https://w3ctag.github.io/security-questionnaire/, as requested in the TAG review instructions.

> 1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

This feature exposes very little to the website. It is mostly one-way from the website to a browser. A website offers a changelog, a browser may or may not care.

> 2. Is this specification exposing the minimum amount of information necessary to power the feature?

Yes

> 3. How does this specification deal with personal information or personally-identifiable information or information derived thereof?

N/A

> 4. How does this specification deal with sensitive information?

N/A

> 5. Does this specification introduce new state for an origin that persists across browsing sessions?

N/A

> 6. What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?

A website may be able to tell if a user views or does not view a change log. That's about it.

> 7. Does this specification allow an origin access to sensors on a user’s device. If so, what kind of sensors and information derived from those sensors does this standard expose to origins?

No.

> 8. What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.

N/A

> 9. Does this specification enable new script execution/loading mechanisms?

No

> 10. Does this specification allow an origin to access other devices?

No

> 11. Does this specification allow an origin some measure of control over a user agent’s native UI?

The feature may show or not show UI relating to changelogs being available or not available.

> 12. What temporary identifiers might this specification create or expose to the web?

N/A

> 13. How does this specification distinguish between behavior in first-party and third-party contexts?

N/A

> 14. How does this specification work in the context of a user agent’s Private Browsing or "incognito" mode?

N/A - No difference

> 15. Does this specification have a "Security Considerations" and "Privacy Considerations" section?

Yes.

> 16. Does this specification allow downgrading default security characteristics?

No
