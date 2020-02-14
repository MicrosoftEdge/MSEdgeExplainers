This has been created by cut-and-paste from https://w3ctag.github.io/security-questionnaire/, as requested in the TAG review instructions.

1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?
The only information exposed is the amount of time expected to be gained by using this API. It is exposed so that site authors can make educated decisions on if they want to use the API or something else for better improvements.

2. Is this specification exposing the minimum amount of information necessary to power the feature?
No. The expected improvement time isn't necessary for the feature to work, but provides valuable information to the site author.

3. How does this specification deal with personal information or personally-identifiable information or information derived thereof?
No personal information is exposed via this feature.

4. How does this specification deal with sensitive information?
N/A

5. Does this specification introduce new state for an origin that persists across browsing sessions?
No.

6. What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?
The user's monitor refresh rate and build version would be exposed.

7. Does this specification allow an origin access to sensors on a user’s device?
No.

8. What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.
The user's monitor refresh rate and build version would be exposed via this change. The monitor refresh rate could already be detected through rAF timing, and the build version is exposed by the UA string.

9. Does this specification enable new script execution/loading mechanisms?
No.

10. Does this specification allow an origin to access other devices?
No.

11. Does this specification allow an origin some measure of control over a user agent’s native UI?
No.

12. What temporary identifiers might this specification create or expose to the web?
No identifiers are created or exposed.

13. How does this specification distinguish between behavior in first-party and third-party contexts?
This feature does not distinguish between these contexts.

14. How does this specification work in the context of a user agent’s Private Browsing or "incognito" mode?
This feature does not distinguish between these modes.

15. Does this specification have a "Security Considerations" and "Privacy Considerations" section?
No.

16. Does this specification allow downgrading default security characteristics?
No.