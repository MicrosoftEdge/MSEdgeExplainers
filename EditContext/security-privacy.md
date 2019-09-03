Questions from https://www.w3.org/TR/security-privacy-questionnaire/

# 2. Questions to Consider

## 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

Just like the existing UI key events, EditContext exposes text that has been typed by the user. This data helps text input services to perform operations such as suggestions, IME compositions, VK shape-writing etc.

## 2.2. Is this specification exposing the minimum amount of information necessary to power the feature?

Yes.

## 2.3. How does this specification deal with personal information or personally-identifiable information or information derived thereof?

EditContext does not expose any PII. It works just like the UI key events.

## 2.4. How does this specification deal with sensitive information?

EditContext does not provide any sensitive data.

## 2.5. Does this specification introduce new state for an origin that persists across browsing sessions?

No.

## 2.6. What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?

EditContext does not expose any data related to the underlying platform.

## 2.7. Does this specification allow an origin access to sensors on a user’s device

No.

## 2.8. What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.

EditContext exposes text that has been typed by the user. This data is not exposed to another origin nor does it allow to access data from other origins.

## 2.9. Does this specification enable new script execution/loading mechanisms?

No.

## 2.10. Does this specification allow an origin to access other devices?

No.

## 2.11. Does this specification allow an origin some measure of control over a user agent’s native UI?

It isn't the user agent UI, but is platform native UI (candidate window during IME compositions) used for input text. The EditContext provides coordinates at which text input related UI should be displayed. It offers a similar level of control compared to what the author can do by positioning an input element in the page. No new behavior is exposed to authors for controlling UI, only new APIs to communicate the coordinates in a more direct way.

## 2.12. What temporary identifiers might this this specification create or expose to the web?

EditContext does not create any temporary identifiers.

## 2.13. How does this specification distinguish between behavior in first-party and third-party contexts?

A user agent may decline to grant permissions requested by third-party contexts. EditContext does not expose any information to third-party contexts. A focused EditContext is limited to the active document, so browser's existing limits on third-party context stealing focus should be applicable to the EditContext too.

## 2.14. How does this specification work in the context of a user agent’s Private Browsing or "incognito" mode?

EditContext does not provide any information that would allow to correlate a single user's activity across normal and private/incognito modes.

## 2.15. Does this specification have a "Security Considerations" and "Privacy Considerations" section?

No. A security or privacy section doesn't currently seem warranted given the answers above.

## 2.16. Does this specification allow downgrading default security characteristics?

No.

# 3. Threat Models

## 3.1 Passive Network Attackers

No network activity is associated with EditContext usage.

## 3.2 Active Network Attackers

No network activity is associated with EditContext usage.

## 3.3 Same-Origin Policy Violations

Existing SOP restrictions prevent accessing an EditContext in one realm from another with a different origin. No special considerations are needed.

## 3.4 Third-Party Tracking

Not applicable (no network requests are made by the EditContext).

## 3.5 Legitimate Misuse

Not applicable as no new information is being made available to authors. The purpose of the EditContext is to expose the functionality bundled into editable elements in a way that is decoupled from the HTML DOM view .

