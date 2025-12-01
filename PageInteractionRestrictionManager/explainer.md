
# Page Interaction Restriction Manager

## Authors

- [Jineen Seirup](http://github.com/jineens)

## Table of Contents

1. [Introduction](#introduction)
2. [User-Facing Problem](#user-facing-problem)
3. [Goals](#goals)
4. [Non-goals](#non-goals)
5. [User Research](#user-research)
6. [Proposed Approach](#proposed-approach)
7. [Example Usage](#example-usage)
8. [Accessibility, Privacy, and Security Considerations](#accessibility-privacy-and-security-considerations)

---

## Introduction

This proposal provides a way for enterprise websites to communicate with enterprise-configured browsers whether certain restrictions should be enforced for a webpage. An example of such a restriction is removing user access to copy data from a webpage, which many enterprise websites attempt to do by intercepting user input and/or overriding the default right click menu.

> Note: This is a data leak/data loss prevention feature and not a security feature. Data leak prevention features are intended to automatically help users avoid accidental, inappropriate disclosure of data and unintentional violations of their company's data management policies. These features are not intended to completely prevent malicious, determined users from extracting data, though the features may enable enterprises to have more opportunity to detect such scenarios.

Access to this JavaScript API in the browser is controlled via enterprise policy on the client device. [Protect Office documents with Microsoft Purview Information Protection labeling | Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-365/compliance/protect-office-files-with-microsoft-information-protection?view=o365-worldwide). Non-browser platforms that leverage web platform technology, such as Microsoft’s WebView2, may also choose to expose APIs that allow a host app to control this API’s availability.

## User-Facing Problem

Web sites (in particular document viewing and editing sites) that wish to implement enterprise-managed browser user interaction restrictions tied to policies associated with the documents need to be able to communicate to the browser about which restrictions need to be enforced.

## Goals

- Allow a communication pathway between enterprise web sites and enterprise configured browsers so that enterprise web sites can communicate what user interaction restrictions they'd like and enterprise configured browsers can communicate which restrictions they are willing to enforce.

## Non-goals

- Prevent a web page from accessing its own document after it’s had these restrictions applied to them; it is up to the web page to maintain control of the code they load on their site.
- Prevent a compromised process (e.g. due to a browser security bug or local malware) from having access to the document. This feature is not a security boundary.
- Create a security boundary that guarantees a motivated user cannot work around restrictions the page and/or browser are attempting to enforce.
- Prevent extensions from interacting with or having access to the DOM of a restricted page. (Many browsers offer enterprises policies to control the use of browser extensions).

## User Research

This API has been designed to take advantage of the same mechanisms available to non-browser applications but in a web-exposed way. Those APIs and resulting system behaviors are well-understood.

## Proposed Approach

The API provides a mechanism to request that a specific type of user interaction no longer be allowed. The list below is the proposed initial set, but it's expected that additional actions will be defined over time. This portion of the API is only visible in the browser.

| Action Name      | Description                                                        |
|------------------|--------------------------------------------------------------------|
| copy             | User can put text from the web site on the OS clipboard.           |
| paste            | User can paste data into the web site from the OS clipboard.       |
| builtin-ai       | AI features built into the browser can process content on the web site. |
| save-as-webpage  | User can save the webpage as an html file.                         |
| debugging-tools  | Browser debugging tools can be used by the user on the webpage.    |
| screenshot       | User can use printscreen for the webpage on supported OSs.         |
| print            | User can print the webpage directly.                               |
| save-as-pdf      | User can save the webpage directly as a pdf.                       |
| extract-data     | User can extract data from the webpage.                            |
| export-data      | User can export data from the webpage outside of the browser.      |

This API also provides a mechanism to associate labels of different types to the web site.

| Supported Label Type         | Description                                            | Data Types                                 | Public documentation                                                                 |
|-----------------------------|--------------------------------------------------------|--------------------------------------------|--------------------------------------------------------------------------------------|
| MicrosoftSensitivityLabels   | Microsoft Purview Information Protection Sensitivity Labels | Label ID: GUIDv4, Organization ID: GUIDv4 | [Overview - Microsoft Information Protection SDK. | Microsoft Learn](https://learn.microsoft.com/en-us/information-protection/develop/overview-information-protection-sdk) |

## Example Usage

### API existence check

The `navigator.pageInteractionRestrictionManager` object is present on web pages where an enterprise-defined policy has indicated it should be used. The object provides methods for determining which types of user interactions can potentially be restricted by the user agent.

```javascript
if (!navigator.pageInteractionRestrictionManager) {
  // The API is not available; the site can, if desired, add its own logic to attempt to impede the user or 
  // notify the user that the document cannot be accessed.
  AddJavascriptCopyBlock();
  return;
}
```

### Detecting user activities that can be blocked

```javascript
const desired_action_names = ["copy", "print"];
const revokable_activities = await navigator.pageInteractionRestrictionManager.getSupportedActivities();

const missing_enforcement_option = desired_action_names.some(x => !revokable_activities.includes(x));
if (missing_enforcement_option) {
  // The API is available, but cannot be used to enforce the desired restriction.
  AddJavascriptCopyBlock();
  return;
}
```

### Asking the browser permission to revoke user activities

Even though the browser supports restricting user interactions, it may choose to disallow a site from using the API, e.g. due to the enterprise configuring the feature in a way that allows the user to choose if the functionality should be allowed.

```javascript
try {
  const revoke_manager = await navigator.pageInteractionRestrictionManager.requestRevokePermission();
} catch {
  // user or policy prevented access
  AddJavascriptCopyBlock();
  return;
}
```

### Asking the browser to revoke specific user activities

```javascript
try {
  const revoked_activities = await revoke_manager.revoke([{name:'copy'}, {name:'print'}]);
} catch {
  // something went wrong, e.g. invalid arguments.
  AddJavascriptCopyBlock();
  return;
}
```

### Checking which user activities were revoked

```javascript
let all_revoked = true;
for (const activity of revoked_activities) {
  if (activity.status == "revoked") {
    console.log("revoked " + activity.name);
  }
  if (activity.status == "denied") {
    console.log("failed to revoke " + activity.name);
    all_revoked = false;
  }
}

if (all_revoked) {
  // If needed, the web page can remove any logic that it implemented to prevent the user from 
  // performing specific actions as the browser is doing it instead.
  RemoveJavascriptCopyBlock();
} else {
  AddJavascriptCopyBlock();
}
```

### Getting the label manager

```javascript
try {
  const label_manager = await navigator.pageInteractionRestrictionManager.requestLabelManager();
} catch {
  console.log("label manager isn’t available");
}
```

### Checking which label types are supported

```javascript
const label_types = await label_manager.getSupportedLabels();
let mip_supported = false;
for (const label of label_types) {
  console.log("Type supported:" + label.type);
  if (label === 'MicrosoftSensitivityLabels') {
    mip_supported = true;
  }
}
```

### Adding a specific Label to the webpage

UUID: [RFC 9562: Universally Unique IDentifiers (UUIDs)](https://datatracker.ietf.org/doc/html/rfc9562)

[Concepts - Label metadata in the MIP SDK | Microsoft Learn](https://learn.microsoft.com/en-us/information-protection/develop/concept-label-metadata)

```javascript
let label;
try {
  if (label_manager) {
    // MicrosoftSensitivityLabel expected format:
    // dictionary, label: GUID, organization GUID. (with dashes, no extra braces)
    label = await label_manager.addLabel('MicrosoftSensitivityLabel', {label:'00000000-0000-0000-0000-000000000000', organization:'11111111-1111-1111-1111-111111111111'});
  }
} catch {
  console.log("something went wrong (invalid args?)");
}
```

### Removing a specific Label from a webpage

```javascript
if (label) {
  // Label must be removed from the same object that added the label.
  label.remove();
}
```

## Accessibility, Privacy, and Security Considerations

### Privacy

- The `navigator.pageInteractionRestrictionManager` object should not rely on device status for existence or what restrictions are supported, as that would allow the website to determine specific information they might not otherwise be able to acquire, such as device management status.
- This API does not have a query method that tells the webpage the state of the action to avoid webpages deducing information about the user's device that it doesn't already have. For instance, allowing a query method would allow the webpage to deduce if the user has specific enterprise policies applied to their device.

### Security

- This API does not guarantee perfect restrictions (there are always ways around such restrictions).
- This API does not protect web sites from having their data compromised due to a virus or security bug.
