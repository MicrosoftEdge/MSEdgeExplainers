# EyeDropper API Security and Privacy Review

The following document contains answers to the [Self-Review Security and Privacy Questionnaire](https://www.w3.org/TR/security-privacy-questionnaire/).

### 2.1. What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary? 

The API will enable web developers to incorporate an eyedropper in their web applications. The eyedropper would allow the developer to access the hex value (of the form #RRGGBB) of a user specified pixel, its position and modifier keys pressed when the pixel was selected. 

The position of the selected color is included to facilitate scenarios where a web app using the eyedropper samples a pixel color from its own document. The web app could, for example, include an alpha channel for the selected pixel or create a palette of colors associated with a pixel's location based on layer information known to the web app. The color value would otherwise be the final composited color as seen by the user. 

Note that the eyedropper only provides pixels back to the web app when the user is explicitly instructing it to capture one, for example, by clicking a mouse button.  Simply moving the eyedropper around the screen does not “screen scrape” information and make it available to the web app. 

### 2.2 Is this specification exposing the minimum amount of information necessary to power the feature? 

Yes.

### 2.3 How does this specification deal with personal information or personally-identifiable information or information derived thereof? 

Not applicable.

### 2.4 How does this specification deal with sensitive information? 

Not applicable.

### 2.5 Does this specification introduce new state for an origin that persists across browsing sessions? 

No.

### 2.6 What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin? 

Not applicable.

### 2.7 Does this specification allow an origin access to sensors on a user’s device 

No.

### 2.8 What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts. 

As noted above, it exposes information about the hex value (of the form #RRGGBB) of a user specified pixel, its position and modifier keys pressed when the pixel was selected.

### 2.9 Does this specification enable new script execution/loading mechanisms? 

No.

### 2.10 Does this specification allow an origin to access other devices? 

No.

### 2.11 Does this specification allow an origin some measure of control over a user agent’s native UI? 

Browsers should provide a clear indication as to when the user has been transitioned into an eyedropper mode, for example by changing the cursor, and provide the means for the user to exit that mode, for example, by pressing an ESC key and not allowing the behavior to be cancelled by the author. 

The transition into eyedropper mode should require consumable user activation, for example, clicking on a button from the web page, to help avoid unintentionally revealing pixel data.

### 2.12 What temporary identifiers might this specification create or expose to the web? 

None.

### 2.13 How does this specification distinguish between behavior in first-party and third-party contexts? 

Not applicable.

### 2.14 How does this specification work in the context of a user agent’s Private Browsing or "incognito" mode? 

No difference.

### 2.15 Does this specification have a "Security Considerations" and "Privacy Considerations" section? 

Yes: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/EyeDropper/explainer.md#privacy

### 2.16 Does this specification allow downgrading default security characteristics? 

No.