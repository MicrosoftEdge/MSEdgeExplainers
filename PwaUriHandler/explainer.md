# PWAs as URI Handlers

Authors: [Lu Huang](https://github.com/LuHuangMSFT) &lt;luhua@microsoft.com&gt;<br>

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* Current version: this document

## Introduction

Developers can create a more engaging experience if Progressive Web Apps (PWAs) are able to register as handlers for http(s) uniform resource identifiers (URIs). This document proposes a scheme for a PWA to register as a URI handler and be launched when associated URIs are activated. PWA developers and end users are the customers of this solution.

Today, native applications on many operating systems (Windows, Android, iOS, MacOS) can be associated with http(s) URIs. They can request to be launched as URI handlers when associated URIs are activated. For example, a user could click on a link to a news story from an e-mail. An associated native app for viewing news stories would automatically be launched to handle the activation of the link. Web developers would be able to build more compelling PWA experiences with stronger user engagement if PWAs could request to be URI handlers through their web app manifests.

PWAs may have different levels of URI handling ability depending on the capabilities of the host OS. Whenever URI activations launch a conforming browser, that browser should have the ability to launch a registered PWA to render the requested content. In the best case, it would be possible for URI activations anywhere in the user's system to launch PWAs because they are registered as URI handlers with the OS. We are proposing changes below that could help accomplish this.

## Goals

1. Enable PWA developers to opt-in to URI handling features using the web app manifest.
2. Enable the default browser to support URI activation by launching a PWA.
3. Where possible, enable registration of PWAs as URI handlers with the operating system.
4. Provide a better user experience by allowing users to explicitly choose an installed PWA in app pickers and disambiguation dialogs.
5. Protect content owners by only allowing associated PWAs to register as URI handlers for their content.
6. Keep the user in control of choosing the best experience for them, whether that is in the browser, in a native app, or in a PWA.

## Non-Goals

* Custom URL protocol handling. A separate explainer for that can be found [here](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/master/URLProtocolHandler/explainer.md).

* Launching PWAs due to in-browser link navigation. Instead, this explainer focuses on scenarios where the URI activation has occurred from outside of the browser.

## Use Case

There is one main use case that we wish to address in this explainer: URI activation in native applications.

The user clicks on a Spotify link in their native e-mail application, (eg., [https://open.spotify.com/album/7FA9xfqPrBaja1sEv15DU2](https://open.spotify.com/album/7FA9xfqPrBaja1sEv15DU2) in the Outlook app), which launches their default browser. Because the user already has the Spotify PWA installed and registered as a URI handler with their default browser, the URI activation launches the PWA instead of a new tab.

## Proposed Solution

We propose the following:

1. Modify the web app manifest format to include a `uri_handlers` dictionary entry.
    * Gives PWAs control over which URIs to handle.
    * Allows PWA developers to opt-in to URI handling in the same way across different platforms.

2. A `pwa-site-association` file format for validating out-of-scope URI associations.
    * Protects content owners by letting them define which PWAs are allowed to associate with their sites.
    * Gives sites control over which URIs are allowed to be handled by each associated PWA.

3. If launched to handle a URI activation, browsers then launch a PWA with matching `uri_handlers` to handle that URI.

4. If multiple PWAs are registered to handle a given URI, browsers display a disambiguation dialog to allow users to choose.

5. On OSes with adequate support, register PWAs as URI handlers at the OS level instead.

**Changes 1-4** allow PWAs to handle URI activations at the browser level, which means that as long as a URI activation (clicking on a link) launches a conforming browser, the browser has the ability to launch the matching PWA. A PWA will not be launched if it was installed through a non-default browser and all URI activations launch the default browser.

To allow PWAs to handle URIs that are outside of their own scope, it is necessary to introduce a mechanism for the owner of those URIs to opt-in to URI handling by PWAs. **Change 2** introduces the concept of a `pwa-site-association` file that will serve this purpose. This file is similar to the [Apple App Site Association File](https://developer.apple.com/documentation/safariservices/supporting_associated_domains_in_your_app#3001215), the [`assetlinks.json`](https://developer.android.com/training/app-links/verify-site-associations) file in Android, and the [`windows-app-web-link`](https://docs.microsoft.com/en-us/windows/uwp/launch-resume/web-to-app-linking#associate-your-app-and-website-with-a-json-file) file in Windows. What differs, is that the `pwa-site-association` file does not require a platform specific app id, but instead identifies PWAs by their web app manifest URL.

**Change 5** will also allow PWAs to handle URI activations at the OS level on supportive platforms. If the PWA is able to register as a URI handler with the OS, it could be launched whenever a URI activation is handled by the OS, regardless of the default browser setting. Most native applications rely on the OS for URI activation. In terms of user experience, the OS could now prompt the user to choose between the PWA and the default browser using the system app disambiguation dialog. The user is able to make an explicit choice to select the PWA and configure their default setting from there. (Implementation note: because most OSes do not know of or treat PWAs as first-class applications, it may not be possible to register them directly with the OS as URI handlers. Supporting changes will need to be made in PWA implementation and/or in the OS to enable this. A notable exception is Chrome's implementation of PWAs on Android using `WebAPK`. Because `WebAPK`s are recognized by the Android OS, Chrome PWAs are able to fully integrate with OS features like the app picker.)

### Manifest Changes

We propose adding a new _optional_ data field `url_handlers` to the manifest object. This data value will contain an array of URI handler declaration objects. Each object should contains a `base` string, an optional `paths` array of strings, and an optional `excludePaths` array of strings.

The `url_handlers` data serves as requests from the PWA to handle URIs. The browser should validate that the PWA has the authority to handle those URIs and then store the request for later use. On an OS that allows for deeper integration, the browser should also perform the URI handling registrations with the OS and keep them in sync with the app lifecycle.

Example web app manifest hosted at `www.contoso.com`:

```json
{
  "name": "Contoso App",
  "description": "A Business App",
  "uri_handlers": [
      {
          "base": "www.contoso.com",
          "paths": ["*"],
          "excludePaths": [
              "/about",
              "/blog",
              "/privacy"
          ]
      },
      {
          "base": "%*.contoso.com",
          "paths": ["*"]
      },
      {
          "base": "www.conto.so",
      }
  ],
  "icons": [
    {
      "src": "images/icons-144.png",
      "type": "image/png",
      "sizes": "144x144"
    }
  ],
  "background_color": "#FFFFFF",
  "display": "standalone",
  "start_url": "/",
}
```

These are the fields in each URI handler object:

| Field     | Required / Optional | Description                                      | Default                           |
|:----------|:--------------------|:-------------------------------------------------|:----------------------------------|
| `base`    | Required            | Base portion of the URI to be handled. Can also be a complete URI. | N/A             |
| `paths`   | Optional            | Array of allowed paths relative to `base`        | `[]`                              |
| `excludePaths` | Optional       | Array of disallowed paths relative to `base`     | `[]`                              |

A URI matches a URI handler if it matches the `base`, at least one of values in `paths` if there are any, and does not match any of the values in `excludePaths`.

Requested URIs do not have to be within the requesting PWA's scope. In this scheme, any URI can be registered as part of the URI handling request. The `base` field is necessary because URIs from different domains can be requested. Not restricting URIs to the same scope or domain as the requesting PWA gives the developer freedom to use multiple domain names for the same content and handle them with the same PWA. See [this section](#pwa-to-site-association) for how cross-domain requests are validated. The `base` field can start with a `%*.` prefix to indicate the inclusion of subdomains.

(Implementation note: URI handling requests are registered with either the browser or the OS when a PWA is being installed. At this point, the browser should validate the requests. If necessary, the PWA install can be failed.)

#### Wildcard Matching

Wildcard characters can be used in the values of all three fields: `base`, `paths`, and `excludePaths`. The wildcard `*` matches zero or more characters. The wildcard `?` matches exactly one character.

The `base` field is able to contain a wildcard prefix to allow the specification of sub-domains: eg. `%*.contoso.com` matches `jadams.contoso.com` and `www.jqadams.contoso.com` but not `contoso.com`.

### PWA to site association

The `base` field in `url_handlers` requests must either match the requesting PWA's scope or [be the location of](#file-location) an association file which validates that the requested URIs' domain is associated with the requesting PWA:

* If the `base` field is equal to or within the PWA's scope, there is no need to provide an association file. The association is already confirmed by the web app manifest. This will be the default case for most PWAs that are just trying to handle URIs within their own scope.
* If the `base` field is outside of the PWA's scope, an association file needs to be downloadable from its path to prove an association to the app.
* The association file must be named `pwa-site-association` and must be found in a `.well-known` directory.

#### pwa-site-association file

Example pwa-site-association file hosted at `www.conto.so/.well-known/pwa-site-association`:

```json
{
  "apps": [
    {
      "manifest": "www.contoso.com/manifest.json",
      "paths": ["/*"],
      "comment": "We own both domains so this is fine."
    },
    {
      "manifest": "www.partnerapp.com/manifest.json",
      "paths": ["/*"],
      "excludePaths": ["/users/*"],
      "comment": "Let our partner's PWA handle all URIs except for user content."
    }
  ]
}
```

This example `pwa-site-association` file proves that `www.conto.so` is associated with the PWA that has a web app manifest at `www.contoso.com/manifest.json`. Furthermore, it allows all `www.conto.so/*` URI to be handled by the PWA. The requested paths in the web app manifest `uri_handlers` data must be a subset of the allowed paths in the association object.

This example shows that `www.conto.so` also allows the PWA with web app manifest at `www.partnerapp.com/manifest.json` to also handle a subset of its URIs. All `www.conto.so/products/*` paths are allowed but all `www.conto.so/users/*` URI are disallowed to be handled by the `partnerapp.com` PWA.

These are the fields in each association object:

| Field     | Required / Optional | Description                                      | Default                           |
|:----------|:--------------------|:-------------------------------------------------|:----------------------------------|
| `manifest`| Required            | URI of the web app manifest of the associated PWA| N/A                               |
| `paths`   | Optional            | Array of allowed paths                           | `["*"]`                           |
| `excludePaths`| Optional        | Array of disallowed paths                        | `[]`                              |
| `comment` | Optional            | Comment associated with this allowance           | None                              |

#### File Location

In the case where a fully specified `base` is used, the association file must be found at `[base]/.well-known/pwa-site-association` (without an extension).

If a `base` with a `%*.` prefix is used, the pwa-site-association file must be present at the path without the prefix. Eg. a `base` of `%*.contoso.com` must have a `pwa-site-association` file at `contoso.com/.well-known/pwa-site-association`.

#### Failure to Associate

If the `pwa-site-association` file cannot be downloaded or the association validation cannot be completed successfully, the browser may either omit the requested URI handler registrations affected or fail the PWA installation completely. The implementor should decide what the best user experience is in this case.

#### Periodic Revalidation

It is possible for sites to modify their associations with installed PWAs by editing their pwa-site-association file at any time. Conforming browsers may revalidate registered URI handlers at appropriate intervals by re-downloading the relevant pwa-site-association files. If a URI handler registration fails to revalidate because the pwa-site-association data has changed, the implementor may prompt the user to un-register URI handlers or uninstall the PWA in a way that is consistent with the behavior during initial validation.

#### Shortened URIs

Web applications often provide users with shortened URIs for their convenience. If developers would like to handle shortened URIs in a PWA, they have to have access to the `base` path of the shortened URIs to place the pwa-site-association file. This may not be possible when using third party URI shortening services that the developer does not have control over.

### Browser Changes

To support basic, browser-level registration of URI handlers, browsers need to make the following changes:

1. Validate and register the URI handling requests from PWA manifests during PWA installation.

2. When starting up with a URI parameter, determine if there are any matching PWA URI handlers.

3. If there is a match, launch the PWA and load the URI in the PWA window instead of the browser window.

4. If there is more than one match, display the choices and collect the user's input with a disambiguation dialog.

5. Keep URI handler registrations in sync with the PWA's lifecycle (i.e. during manifest update, uninstall, etc.)

#### User preferences

If URI handlers are registered and launched at the browser level, the browser should implement a URI handling config page to allow the user to enable/disable URI handlers, set default launch behavior, etc. If URI handlers are registered and launched at the OS level, the browser should implement a config page that redirects to the OS settings.

#### Handling multiple registrations

The association file is able to contain association objects for multiple PWA handlers. Multiple PWAs are able to request to handle the same URI. In cases where there are multiple registered handlers available, the browser or OS should present options to the user and allow the user to decide which handler to use.

### Operating System Changes

To provide OS level registration of URI handlers, browsers' PWA implementations need to integrate more deeply with the OS application platform. This is to allow the OS to recognize PWAs as apps that can be launched and can therefore serve as URI handlers. There may be different approaches to accomplishing this, and they might differ on different OSes. OS changes may be necessary to enable this integration. In OS or browser versions where this integration cannot be implemented, the behavior should default to URI handling by the browser.

## Security Considerations

URI handlers, if implemented improperly, can be used to hijack traffic for websites. This is why the pwa to site association mechanism is an important part of the proposed scheme. Associations must be validated when PWAs are installed, and they should be validated again periodically to evaluate any new changes in the association file and web app manifest.

In the case where the browser registers URI handling with the OS on behalf of PWAs, the OS must trust the browser to validate the PWA-to-site association or implement the validation itself. If the OS delegates the validation to browsers, it must be clear which browsers are compliant with the validation requirements.

If an associated site is overtaken by a malicious actor, it is possible for users to be exposed to malicious content through the PWA handling those URIs. To mitigate this risk, the browser may want to suppress the PWA launch or get user confirmation using a security mechanism which detects risky URIs.

Conforming browsers may want to limit the maximum allowed number of `uri_handlers` entries to N and the numbers of `paths` and `excludePaths` each to M. This will limit the amount of work the manifest parser does and further limit the risk of URI hijacking.

URI handler registrations should only be performed for installed PWAs as users expect installed applications to be more deeply integrated with the OS. Furthermore, conforming browsers should not register PWAs as URI handlers for any URI without an explicit user confirmation.

## Privacy Considerations

The introduction of URI handling features carries a fingerprinting risk: a third party could build up a profile on a user if they can determine which PWAs that the user has installed on their device.

As websites are currently unable to launch URI handlers through normal in-browser navigation, this is not an immediate privacy concern. Fingerprinting risks should be thoroughly examined when designing web APIs that activate URI handlers instead of performing in-browser navigation.

Native applications can already use OS APIs to enumerate installed applications on the user's system. For example, native applications in Windows can use the [FindAppUriHandlersAsync](https://docs.microsoft.com/en-us/uwp/api/windows.system.launcher.findappurihandlersasync) API to enumerate URI handlers. If PWAs register as OS level URI handlers in Windows, their presence would be visible to other applications.

## OS Specific Implementation Notes

### Windows

Starting from the Windows 10 Anniversary update, Windows enabled an ["Apps for Websites"](https://docs.microsoft.com/en-us/windows/uwp/launch-resume/web-to-app-linking) capability that allowed the registration of apps to handle URIs from associated websites.

### Android

Chrome PWAs are installed on Android by downloading a signed [WebAPK](https://developers.google.com/web/fundamentals/integration/webapks) file generated by a Google service. When a Chrome PWA is installed on Android, it will [register a set of intent filters](https://developers.google.com/web/fundamentals/integration/webapks?hl=ro#android_intent_filters) for all URIs within the scope of the app. This means that Chrome PWAs already handle associated URIs on Android at the OS level using intent filters. Google calls this Deep Linking. Additionally, Android apps are also able to register to be URI handlers by using Android App Links. App Links require server side verification of the relationship to the app while Deep Links do not. Deep Linking will show an app picker but App Linking will take the user directly to the app.

Other browsers (e.g., Edge) on Android are able to add PWAs to the home screen but are not able to register intent filters. They likely need to also be able to use a WebAPK implementation or similar to enable URI handling.

### iOS, MacOS

iOS allows the association of apps to websites using [Universal Links](https://developer.apple.com/ios/universal-links/). Some PWA features are also implemented on Safari. There is not currently a way to generate and install a PWA from any other browser. PWA URI handling may not currently be possible on iOS. Newer versions of MacOS also support Universal Links.

## Open Questions
