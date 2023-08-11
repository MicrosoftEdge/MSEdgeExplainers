# API for Acquisition Attribution of Web Apps

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

1. Provide a web API around 3P acquisition attribution for PWAs acquired through an app store or directly
from the browser.

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
`navigator`, which provides access to the `getDetails()` method that surfaces various acquisition details,
including the Campaign ID. There is no need for a parameter input when calling this method,
as current implementations of the native API for Store information depend on
derived contexts rather than specific service providers.
We are introducing the layer of `acquisitionInfoProvider` to `navigator` (rather than flattening
the API as `navigator.getDetails()`) in order to leave the possibility of additional functionality
attached to the `acquisitionInfoProvider` attribute open.

```js
if (navigator.acquisitionInfoProvider === undefined) {
  // The Acquisition Info API is not supported in this context.
  return;
}
try {
  const acquisitionInfoProvider = await navigator.acquisitionInfoProvider.getDetails();
  // Use the returned dictionary here.
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
let installSource = details["installSource"]; // e.g. Microsoft Store
let campaignId = details["campaignId"]; // e.g. adCampaign202306
```

While there are some common key-value pairs, depending on the platform of the acquisition the
pairs contained within the dictionary may differ to fit different use cases.

> Payload examples are taken from [Play Install Referrer][Play Install Referrer API] and [Apple Ads Attribution][Apple Ads Attribution API]
documentation and are not final.

```js
details = {
  installSource: "Google Play Store",
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
  installSource: "Apple App Store",
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
  installSource: "Microsoft Store",
  campaignId: ""
}
```

## Attribution on browser installs

While attribution is currently not being tracked in the same capacity as Store installations for browser-initiated
installations of web applications, the Acquisition Info API could enable this sort of attribution capability.

### Same-domain installation

Currently the main method of installing a PWA through the browser is navigating to the desired web application and
initiating a same-domain installation. It may be the case that the intial navigation was due to an ad click.
By having the user agent (UA) capture a stadardized property (`attributionId`) for what led the user to the page
upon installation, it becomes possible for the Acquistion Info API to return attribution information for browser-installed
web applications as well.

#### Example same-domain use case

1. User clicks on a Bing ads campaign that leads them to _foo.com?atr\_id=bingAdsAug2023_.

2. User installs the _foo.com_ PWA from _foo.com_.

3. UA captures the attribution information at the time of installation.

4. Calling the Acquisition Info API `getDetails()` for _foo.com_ PWA produces the following payload.

```js
details = {
  installSource: "foo.com",
  attributionId: "bingAdsAug2023"
}
```

### Web Install API (Cross-domain installation)

With the addition of the [Web Install API][Web Install API], there exists a possibility of cross-domain
browser-initiated installations that may have associated attribution information through the new capability
of webapps to install other webapps. Apps installed through the Web Install API will hold a promise
within its returned success value that allows an opportunity for the installation origin to receive ad attribution information,
at which point can be captured by the UA for later retrieval by the Acquisition Info API.

#### Example cross-domain use case

1. User clicks on a Bing ads campaign (`bingAdsAug2023`) that leads them to a web application repository located at _apprepo.com_.

2. User initiates installation of the _foo.com_ PWA from _apprepo.com_.

3. UA captures the installation origin and the attribution information returned through the Web Install API.

4. Calling the Acquisition Info API `getDetails()` for _foo.com_ PWA produces the following payload.

```js
details = {
  installSource: "apprepo.com",
  attributionId: "bingAdsAug2023"
}
```

There is also the possibility that the advertisement is in the app repo itself, in which case the attribution
information would still be returned in the Web Install API promise.

## Other attribution cases

### Policy applications

It's possible that a policy app could have associated attribution, perhaps implemented through URL parameters. In this case queries
to the API should reflect the type of app in its install source as well as that attribution information which will follow the same property
convention as browser installations.

```js
details = {
  installSource: "Policy",
  attributionId: "bingAdsAug2023"
}
```

### Synced applications

When PWAs are synced across devices for the same user, the UA may make it easier to install that same set of PWAs. In this case,
the acquisition information that is recorded for the originally acquired application should be maintained to be the same for all
other installations.

## Privacy and Security Considerations

1. _Lack of validation_: It is assumed that the install source does not perform any validation
  or sanitation of the acquisition data retrieved itself.

2. _Lack of user control regarding acquisition identifiers_: This solution provides no method for
   the user to clear, disable, or modify the data retrieved from `acquisitionInfoProvider.getDetails()`.  We recognize that different vendors may have specific preferences and requirements regarding this aspect,
   so we defer to the individual install sources to handle that implementation.

3. _Potential misuse of acquisition identifiers_: Acquisition identifiers could potentially be
   manipulated or obscured by ad networks or referral sources, similar to the existing practices
  in advertising. However, this behavior is not specific to the proposed API and is already
  possible with ad campaigns.

This API can only be invoked in a top-level [secure context][secure context]. This is in order to prevent attackers from accessing privacy information that
is being exposed in this API.

## Glossary

| Term        | Definition                                                          |
| ----------- | ------------------------------------------------------------------- |
| Attribution | Identifying the source that led to an installation.                 |
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

### What properties should we be returning for browser installation?

Currently, we are returning the `attributionId` property as the sole descriptor for browser acquisition. Is this enough?
What about the inclusion of an install timestamp or install date as present in the Play Install Referrer API, or instead
capturing an entire query string in order to give more flexibility on what kind of information is presented in the browser
acquisition information?
