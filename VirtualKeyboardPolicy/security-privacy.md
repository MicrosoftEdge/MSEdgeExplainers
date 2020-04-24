Questions from https://www.w3.org/TR/security-privacy-questionnaire/

# 2. Questions to Consider

## 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

VirtualKeyboard interface has APIs that authors could use to explicitly control VK behavior. It also exposes the size of the VK so the sites can reflow the occluded content.

## 2.2. Is this specification exposing the minimum amount of information necessary to power the feature?

Yes.

## 2.3. How does this specification deal with personal information or personally-identifiable information or information derived thereof?

VirtualKeyboard APIs do not expose any PII. The keyboard geometry information doesn't leak any information about the users using it to type sensitive info(username. password etc).

## 2.4. How does this specification deal with sensitive information?

VirtualKeyboard APIs only let authors control the visibility of the VK. The JS key events that have the key information typed by the user is already being exposed through various DOM keyboard events.

## 2.5. Does this specification introduce new state for an origin that persists across browsing sessions?

No. The navigator object that exposes the VirtualKeyboard is a window property.

## 2.6. What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?

VirtualKeyboard APIs do not expose any information from the underlying platform. If a platform doesn't support VK, then these APIs are no-op.

## 2.7. Does this specification allow an origin access to sensors on a user’s device

No.

## 2.8. What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.

VirtualKeyboard interface only exposes the geometry of the VK. This data is not exposed to another origin nor does it allow to access data from other origins.

## 2.9. Does this specification enable new script execution/loading mechanisms?

No.

## 2.10. Does this specification allow an origin to access other devices?

No.

## 2.11. Does this specification allow an origin some measure of control over a user agent’s native UI?

It isn't the user agent UI, but is platform native UI (on-screen keyboard) used for input text. No new behavior is exposed to authors for controlling UI, only new APIs to control the behavior and geometry of the VK. The VK's layout can be controlled through an already existing inputMode attribute which is unrelated to the VirtualKeyboard APIs being proposed here.

## 2.12. What temporary identifiers might this this specification create or expose to the web?

VirtualKeyboard interface does not create any temporary identifiers.

## 2.13. How does this specification distinguish between behavior in first-party and third-party contexts?

Use of the VirtualKeyboard interface is limited to the active document.

## 2.14. How does this specification work in the context of a user agent’s Private Browsing or "incognito" mode?

VirtualKeyboard interface does not provide any information that would allow to correlate a single user's activity across normal and private/incognito modes.

## 2.15. Does this specification have a "Security Considerations" and "Privacy Considerations" section?

No. A security or privacy section doesn't currently seem warranted given the answers above.

## 2.16. Does this specification allow downgrading default security characteristics?

No.

# 3. Threat Models

## 3.1 Passive Network Attackers

No network activity is associated with VirtualKeyboard interface usage.

## 3.2 Active Network Attackers

No network activity is associated with VirtualKeyboard interface usage.

## 3.3 Same-Origin Policy Violations

Existing SOP restrictions prevent accessing a VirtualKeyboard interface in one realm from another with a different origin. No special considerations are needed.

## 3.4 Third-Party Tracking

Not applicable (no network requests are made by the VirtualKeyboard interface).

## 3.5 Legitimate Misuse

A misuse of this API that we can think of is blocking users from accessing the VirtualKeyboard. This can already be done by an existing attribute inputMode="none" on an element and never change the value. Also, on certain platforms like Windows, users could manually pull up the VK from an icon present on the taskbar so maybe this doesn't completely block the users from accessing the VK.

