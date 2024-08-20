
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
across all Store platforms (Microsoft Store, Google Play Store, Apple App Store). On
Windows, this limitation prevents PWAs published in the Microsoft Store from obtaining the
Campaign ID which identifies the ad campaign source of app acquisition. While
[Universal Windows Platform (UWP) apps can access this information through a WinRT API][WinRT API],
the absence of similar functionality for PWAs poses a gap between native applications and
PWAs. We aim to not only bridge this gap, but to enable similar functionality surrounding attribution
for browser-installed web applications through the introduction of the **Acquisition Info API**.

## Goals

1. Provide a web API around 3P acquisition attribution for PWAs acquired through an app store or directly
from the browser.

## Non-Goals

1. Define how a UA can retrieve acquisition information from every platform-specific Store.

## Store-install Scenario (Windows)

A web app developer has submitted their app to the Microsoft Store, and they have created ad
campaigns to promote their app.  When a user sees and clicks on an advertisement that leads them to
acquire the web app from the Store, the ad Campaign ID associated with the advertisement
is recorded by the Store, and associated with the user's app entitlement. On any given launch
of the Store-acquired web app, the web app developer can call the JavaScript API to request the
acquisition information from the Store in order to retrieve the Campaign ID associated with that
user/app acquisition. The web app developer will then be able to use this information to help
determine which ad campaigns were most effective to best inform their future ad investment
decisions.

## Proposed Solution

The Acquisition Info API introduces the `navigator.acquisitionInfoProvider` attribute which allows
developers to access a promise method that can return acquisition information for installed
web apps. The API will be `undefined` when run as a normal tab in the browser (which explicity excludes
support for the [`browser` display mode][display mode]). To obtain a valid value, the site needs to run as an
installed web app. Browser extensions are not eligible to call this API.

### The current shape of acquisition information

Currently, there are extensive solutions across multiple platforms for obtaining acquisition
information in native applications beyond the WinRT API solution for Windows platform. The Google
Play Store has the [Play Install Referrer API][Play Install Referrer API] to retrieve referral content from Google Play such as
referrer URL, while the Apple App Store has the [Apple Ads Attribution API][Apple Ads Attribution API] that provides payloads
with information such as campaign ID. However, all of these solutions are only available for use by
native applications and there exists no equivalent for web apps. The Acquisition Info API aims to
continue efforts to close the gap between native apps and web apps by providing that missing
functionality.

### Accessing the provider as an attribute

`navigator.acquisitionInfoProvider` accesses the acquisition info provider attribute of
`navigator`, which provides access to the `getDetails()` method that surfaces various acquisition details,
including the Campaign ID. There is no need for a parameter input when calling this method,
as the user agent (UA) is expected to derive application context through the UA or store platform user account.

```js
// Detecting if the API is supported in this context.
if (navigator.acquisitionInfoProvider) {
  try {
    let details = await navigator.acquisitionInfoProvider.getDetails();
    // App may log results here for backend attribution purposes
    console.log("Install source was: ", details.installSource);
    consle.log("From campaign: ", details.campaignId);
    // Use the returned dictionary here.
    ...
  } catch (error) {
    if (error.name === 'NetworkError') {
      // There was a network failure in accessing the Store endpoint. 
      return;
    } else if (error.name === 'AccessError') {
      // There was an error in accessing UA provided offline values.
      return;
    }
  }
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

`installSource` is a required dictionary property with values dependent on the following scenarios:

1. `Microsoft Store` | `Google Play Store` | `Apple App Store` - The web app was installed through one of these store platforms.

2. `Policy` - The web app was installed due to an enterprise policy.

3. `Sync` - The web app was installed as part of app sync.

4. `Preinstall` - The web app was preinstalled on the device.

5. `<install origin>` - For [same-domain installation](#same-domain-installation), the domain name of the web app.
For [cross-domain installation](#web-install-api-cross-domain-installation), the installer's domain name.

While `installSource` remains a required property, depending on the platform of the acquisition the pairs contained within
the dictionary may differ to fit different store use cases.

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
By having a standardized dictionary property (`attributionId`) that the UA is responsible for capturing to keep track of ad attribution,
it becomes possible for the Acquistion Info API to return attribution information for browser-installed web applications as well.
This `attributionId` dictionary property could be captured by the UA through a query string parameter such
as `__a_id` in the GET parameters for the website. `httpReferrer` and `installTimestamp` are proposed as properties that should
also be captured by the UA at install time and are included in every dictionary result for a browser-installed app.

#### Example same-domain use case

1. User clicks on a Bing ads campaign on `bar.com` that navigates to `foo.com?__a_id=bingAdsAug2023`.

2. User installs the `foo.com` PWA from `foo.com`.

3. UA captures the attribution information to be eventually returned at the time of installation.

4. Calling the Acquisition Info API `getDetails()` for `foo.com` PWA produces the following payload.

> Proposed dictionary properties are not final and subject to change based on feedback.

```js
details = {
  installSource: "foo.com",
  attributionId: "bingAdsAug2023",
  httpReferrer: "https://bar.com/",
  installTimestamp: "2023-08-16 10:30:00 UTC"
}
```

### Web Install API (Cross-domain installation)

With the addition of the [Web Install API][Web Install API], there exists a possibility of cross-domain
browser-initiated installations that may have attribution information through the new capability
of webapps to install other webapps. The Web Install API contains a `referral-info` parameter for its installation
method, which contains an object that can hold arbitrary attribution information. The UA can capture the information
contained in `referral-info` at install time so that the Acquisition Info API can return the data later.

#### Example cross-domain use case

For example, a user clicks on a Bing ads campaign on `bar.com` that navigates to the Microsoft Store website (`apps.microsoft.com`) product landing
page for `foo.com`. `foo.com` may have defined that they want the Microsoft Store to also pass the region of installation and version of the app
being installed as part of the acquisition information. This could be accomplished in the following fashion:

From `apps.microsoft.com`:

```js
if ('install' in navigator) {
  // Build the referral-info object
  var referralInfo = {
    region: "US",
    installVersion: "1.0.0.0"
  };
  // Web install with additional attribution information
  const appInstalled = await navigator.install("https://www.foo.com/app", "https://www.foo.com/install_url", {"referral-info": referralInfo});
}
```

Result of a `navigator.acquisitionInfoProvider.getDetails()` call
from the installed web app, `foo.com`:

```js
details = {
  installSource: "apps.microsoft.com",
  attributionId: "bingAdsAug2023",
  httpReferrer: "https://bar.com/",
  installTimestamp: "2023-08-16 10:30:00 UTC",
  region: "US",
  installVersion: "1.0.0.0"
}
```

## Other attribution cases

### Policy applications

It's possible that a policy app could have associated attribution, perhaps implemented through its URL parameters. In this case queries
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
other installations. This applies to any and all other installation for the same user profile across any other device supported
by the UA.

For example, a user may discover App A through an ad campaign run on the Microsoft Store. The user proceeds to install App A on
Device A. Running `getDetails()` from the newly acquired app would return the following:

```js
details = {
  installSource: "apps.microsoft.com",
  attributionId: "adCampaign",
  ...
} 
```

The same user logs in on Device B and logs into the profile that installed App A on Device A. Sync would install App A once again
but on Device B, at which point the `getDetails()` payload would return the following:

```js
details = {
  installSource: "Sync",
  attributionId: "adCampaign",
  ...
} 
```

While the `installSource` changes to correctly reflect the app's new install source, the `attributionId` stays the same. This
ensures that we are able to accurately track which users were impacted by which acquisition campaigns even across devices where
synced applications are installed.

## Considered Alternatives

### Flattening the API

Right now, there is only one method available under the `acquisitionInfoProvider` attribute, so it seems a natural course of action
to remove the inbetween layer of `acquisitionInfoProvider` and instead have a `navigator.getAcquisitionInfoDetails()` method.

```js
// Detecting if the API is supported in this context.
if (getAcquisitionInfoDetails in navigator) {
  try {
    let details = await navigator.getAcquisitionInfoDetails();
    // Use the returned dictionary here.
    ...
  }
}
```

However, doing so eliminates the possibility of future additional functionality attached to the attribute. In this case, ensuring
all of the acquisition info related methods remain under `acquisitionInfoProvider` provides clean categorization rather than cluttering
navigator with multiple possible methods.

### Attaching to the Get Installed Related Apps API

The possiblity of attaching acquisition as metadata to the [`navigator.getInstallRelatedApps()`][gIRA] API as it already returns
installed app data such as `url` and `platform` exists.

```js
const relatedApps = await navigator.getInstalledRelatedApps();
relatedApps.forEach((app) => {
  console.log(app.installSource, app.campaignId);
});
```

However, considering the information that the method covers, it likely isn't
the correct place to put acquisition related information. It's not a clear user experience mapping to call the Get Installed Related Apps
API to get acquisition related information. Additionally, since in the proposed solution for the Acquisition Info API a myraid of acquistion
related attributes is able to be returned, the Get Installed Related Apps API return fields would quickly become overcrowded with unrelated information.

### Non-API web app start-up params

When an installed web application is launched, acquisition information such as campaign ID could be inserted into the launch URL parameters for the web app.
However, this would mean any networked communications would have to take place during the start-up process of the web application, and acquisition information would
only be retrievable on the landing page of the installed web application prior to any navigation within the page. The flexibility of the acquisition information would
also become greatly limited without overcrowding the query parameters.

## Privacy and Security Considerations

1. _Lack of validation_: It is assumed that the install source does not perform any validation
  or sanitation of the acquisition data retrieved itself.

2. _User control regarding acquisition information_: For browser installed web apps, it is recommended that the UA clears saved acquisition information
  if the user clears cached site data. For store installed web apps, we recognize that different vendors may have specific preferences and requirements
  regarding this aspect, so we defer to the individual install sources for handling of stored acquisition information.

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
| UA          | User Agent                                                          |

[WinRT API]: https://learn.microsoft.com/en-us/uwp/api/windows.services.store.storecollectiondata.campaignid
[display mode]: https://developer.mozilla.org/en-US/docs/Web/Manifest/display
[Play Install Referrer API]: https://developer.android.com/google/play/installreferrer
[Apple Ads Attribution API]: https://developer.apple.com/documentation/ad_services
[secure context]: https://w3c.github.io/webappsec-secure-contexts/
[Web Install API]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer.md
[gIRA]: https://web.dev/get-installed-related-apps/#use

## Open Questions

### How should we be filtering the information returned in `getDetails()`?

The flexibility outlined in the current return fields offers a potential vulnerability in not filtering the
information being surfaced. This means that fields could even contain unintended information.
If we were to mitigate this in scoping down the fields that are returned down to specific values or lengths,
what would that look like? What values are we interested in across all platforms?
