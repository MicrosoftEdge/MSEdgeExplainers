# Answers to [Security and Privacy Questionnaire](https://www.w3.org/TR/security-privacy-questionnaire/)

### 2.1 What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?

No extra information exposed.

### 2.2 Is this specification exposing the minimum amount of information necessary to power the feature?

Yes, this feature only requires one additional member in the existing web app manifest which is provided for installed PWAs.

### 2.3 How does this specification deal with personal information or personally-identifiable information or information derived thereof?

We don't store any PII. We don't require any user sign-in info. This feature integrates into the existing PWA install flow.

### 2.4 How does this specification deal with sensitive information?

Shortcuts URLs and shortcuts icon URLs added in the Web App Manifest are parsed to ensure they're valid following the spec: https://url.spec.whatwg.org/#concept-url-parser.

### 2.5 Does this specification introduce new state for an origin that persists across browsing sessions?

A web developer could have specific reserved urls for shortcuts. Using these, they could tell when a user navigated to the page from a shortcut item. But they'd first need the user to agree to install the app.

### 2.6 What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?

None.

### 2.7 Does this specification allow an origin access to sensors on a user’s device?

No.

### 2.8 What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.

We exposed data identical to data exposed by other members of the web app manifest.

### 2.9 Does this specification enable new script execution/loading mechanisms?

This code executes at the PWA install time. It does not have to do with any script execution.

### 2.10 Does this specification allow an origin to access other devices?

No. We only support same origin Task URLs. Shortcuts are parsed per the algorithms in the spec here: https://w3c.github.io/manifest/#shortcuts-member

### 2.11 Does this specification allow an origin some measure of control over a user agent’s native UI?

Yes. This integrates into the OS's Shortcuts menu/Jumplist. Any correctly formatted shortcuts' name and icon will show up in the Jumplist. Clicking on the link navigates to the target page.

### 2.12 What temporary identifiers might this specification create or expose to the web?

None.

### 2.13 How does this specification distinguish between behavior in first-party and third-party contexts?

We only support same origin Task lists.

### 2.14 How does this specification work in the context of a user agent’s Private \ Browsing or "incognito" mode?

This feature is integrating into the existing PWA installation flow. This flow is not available in Private Browsing mode.

### 2.15 Does this specification have a "Security Considerations" and "Privacy Considerations" section?

Yes. See https://www.w3.org/TR/appmanifest/#installation-sec.

### 2.16 Does this specification allow downgrading default security characteristics?

No.

### 3.5 Legitimate Misuse

General note for this section: A web developer could have specific reserved urls for shortcuts. Using these, they could tell when a user navigated to the page from a shortcut item. But they'd first need the user to agree to install the app.
