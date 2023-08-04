# API for Ad Attribution of Web Apps

Author: [Alex Kyereboah](https://github.com/akyereboah_microsoft)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing
collaborative solutions fit for standardization. As the solutions to problems described in this
document progress along the standards-track, we will retain this document as an archive and use
this section to keep the community up-to-date with the most current standards venue and content
location of future work and discussions.

* This document status: **Active**
* Expected venue: [Microsoft Edge Explainers](https://github.com/MicrosoftEdge/MSEdgeExplainers)
* **Current version: this document**

## Introduction

One of the major issues blocking the adoption of store platform advertisements is the lack of
support for third-party (3P) attribution for Progressive Web Apps (PWAs). While attribution and
acquisition information may look slightly different based on platform, PWAs lack this capability
across all Store platforms (Microsoft Store, Google Play Store, Apple App Store). For example, on
Windows, this limitation prevents PWAs published in the Microsoft Store from obtaining the
Campaign ID which identifies the ad campaign source of app acquisition. While
[Universal Windows Platform (UWP) apps can access this information through a WinRT API][WinRT API],
the absence of similar functionality for PWAs poses a gap between native applications and
PWAs that we aim to bridge with the introduction of the Acquisition Info API.

## Goals

1. Provide a web API around 3P ad attribution for PWAs acquired through an app store.

## Non-Goals

1. Fully implement attribution information retrieval process for every platform.

## Use Case (Windows)

A web app developer has submitted their app to the Microsoft Store, and they have created ad
campaigns to promote their app.  When a user sees and clicks on an advertisement that leads them to
acquire the web app from the Store, the ad Campaign ID associated with the advertisement
is recorded by the Store, and associated with the user's app entitlement. On any given launch
of the Store-acquired web app, the web app developer can call the JavaScript API to request the
acquisition information from the Store in order to retrieve the Campaign ID associated with that
user/app acquisition. The web app developer will then be able to use this information to help
determine which ad campaigns were most effective, to best inform their future ad investment
decisions.

## Proposed Solution

The Acquisition Info API introduces the `navigator.acquisitionInfoProvider` attribute which allows
developers to access promise methods that can return acquisition information for Store-installed
web apps. The API will be `undefined` when run as a normal tab in the browser (which explicity excludes
support for the [`browser` display mode][display mode]). To obtain a valid value, the site needs to run as an
installed webapp. Browser extensions are not eligible to call this API.

### The current shape of acquisition information

Currently, there are extensive solutions across multiple platforms for obtaining acquisition
information in native applications beyond the WinRT API solution for Windows platform. The Google
Play Store has the [Play Install Referrer API][Play Install Referrer API] to retrieve referral content from Google Play such as
referrer URL, while the Apple App Store has the [Apple Ads Attribution API][Apple Ads Attribution API] that provides payloads
with information such as campaign ID. However, all of these solutions are only available for use by
native applications and there exists no equivalent for web apps. The AcquisitionInfo API aims to
continue efforts to close the gap between native apps and web apps by providing that missing
functionality.

### Accessing the provider as an attribute

`navigator.acquisitionInfoProvider` accesses the acquisition info provider attribute of
`navigator`, which provides access to methods such as `getDetails()` that surface various acquisition details,
including the Campaign ID. There is no need for a parameter input when calling this method,
as current implementations of the native API for Store information depend on
derived contexts rather than specific service providers.
We are introducing the layer of `acquisitionInfoProvider` to `getDetails()` (rather than flattening
the API) in order to leave the possibility of additional functionality attached to `acquisitionInfoProvider` open.

```js
if (navigator.acquisitionInfoProvider === undefined) {
  // The Acquisition Info API is not supported in this context.
  return;
}
try {
  const acquisitionInfoProvider = navigator.acquisitionInfoProvider.getDetails();
  // Use the service here.
  ...
} catch (error) {
  // We encountered a failure while building the object
  // The method must be recalled at a later time
  return;
}
```

### Accessing acquisition details

Once we've accessed the provider, we can asynchronously retrieve a dictionary payload of
acquisition details through the `getDetails()` method which returns a ScriptPromise object.

```js
details = await navigator.acquisitionInfoProvider.getDetails();
let platform = details["storePlatform"]; // e.g. Microsoft Store
let campaignId = details["campaignId"]; // e.g. adCampaign202306
```

While there are some common key-value pairs, depending on the platform of the acquisition the
pairs contained within the dictionary may differ to fit different use cases.

```js
details = {
  storePlatform: "Google Play Store",
  installReferrer: "utm_source=google-play&utm_medium=organic",
  referrerClickTimestampSeconds: 1623214800,
  installBeginTimestampSeconds: 1623214810,
  installBeginReferrer: "utm_source=google-play&utm_medium=referral&utm_campaign=campaign-123",
  installVersion: "1.0.0",
  googlePlayInstant: false
}
```

```js
details = {
  storePlatform: "Apple App Store",
  attribution: "true",
  orgId: "40669820",
  campaignId: "542370539",
  conversionType: "Download",
  adGroupId: "542317095",
  countryOrRegion: "US",
  keywordId: "87675432",
  adId: "542317136"
}
```

In the event that a web application has referral information that has expired for that specific
application, or in any other case where acquisition info is missing for the web application,
the API would return empty values for the associated properties in the dictionary. This is consistent with
existing behavior in store information retrieval API for native applications.

```js
details = {
  storePlatform: "Microsoft Store",
  campaignId: ""
}
```

## Attribution on browser installs

While attribution is currently not being tracked in the same capacity as Store installations for browser-initiated
installations of web applications, the Acquisition Info API could enable this sort of attribution capability.

### Same-domain installation

One solution for capturing attribution in organic same-domain installations initiated as an user agent (UA) install
could be the use of query parameters. If the web application after installation
has listed GET parameters in their URL as attribution information, within the API we can define acquisition related parameters
to capture such as `c_id` and translate it into the dictionary return.

```js
// URL: foo.com?c_id=browserInstallationCampaign
details = {
  storePlatform: "",
  campaignId: "browserInstallationCampaign"
}
```

This could also be expanded upon to capture a set of acquisition parameters related to browser installation such as the web
referrer or any parameter of interest that is already being captured in Store attribution.

### Web Install API

Currently UA installs are initiated by the user directly on the website they want to install.
There's no opportunity for these web app installs to have attribution information in the same way that store
initiated web app installations do. However, with the addition of the Web Install API, there exists a
possibility of cross-domain UA installations that may have associated attribution information through an app directory,
and the new capability of webapps to install other webapps. Apps installed through the Web Install API will hold a promise
within its returned success value that allows an opportunity for the installation origin to retrieve attribution information,
at which point can be captured by the Acquisition Info API. _[See the Web Install API explainer for more information.][Web Install API]_

## Privacy and Security Considerations

1. _Lack of validation_: It is assumed that the Store platform does not perform any validation
  or sanitation of the Campaign ID itself.

2. _Lack of user control regarding acquisition identifiers_: This solution provides no method for
   the user to clear, disable, or modify the data retrieved from `acquisitionInfoProvider`.  We recognize that different vendors may have specific preferences and requirements regarding this aspect,
   so we defer to the individual Store platforms to handle that implementation.

3. _Potential misuse of acquisition identifiers_: Acquisition identifiers could potentially be
   manipulated or obscured by ad networks or referral sources, similar to the existing practices
  in advertising. However, this behavior is not specific to the proposed API and is already
  possible with ad campaigns.

This API can only be invoked in a top-level [secure context][secure context]. This is in order to prevent attackers from accessing privacy information that
is being exposed in this API.

## Glossary

| Term        | Definition                                                          |
| ----------- | ------------------------------------------------------------------- |
| Attribution | Identifying the source by which an installation occured.            |
| Acquisition | Installation of the application in question.                        |
| PWA         | Progressive Web App                                                 |
| UWP         | Universal Windows Platform                                          |
| API         | Application Programming Interface                                   |
| WinRT       | Windows Runtime                                                     |
| Store       | Microsoft Store                                                     |
| App         | Application                                                         |
| Campaign ID | A unique identifier that is associated with a specific ad campaign. |

[WinRT API]: https://learn.microsoft.com/en-us/uwp/api/windows.services.store.storecollectiondata.campaignid
[display mode]: https://developer.mozilla.org/en-US/docs/Web/Manifest/display
[Play Install Referrer API]: https://developer.android.com/google/play/installreferrer
[Apple Ads Attribution API]: https://developer.apple.com/documentation/ad_services
[secure context]: https://w3c.github.io/webappsec-secure-contexts/
[Web Install API]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer.md

## Open Questions

### Should we be returning some sort of install source on a browser installed app query?

In the [current iteration of this proposal](#same-domain-installation), the API returns an empty string in the `storePlatform` field
when called in a browser installed application. We could instead indicate a string value of `Browser`. However, this would mean we'd have to cover cases for other install types such as policy PWAs. Would it be appropriate to cover this browser case, or perhaps change the
`storePlatform` field to something more general such as `installSource`?
