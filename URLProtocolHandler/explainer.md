# URL Protocol Handler Registration for PWAs

## Table of Contents
<!-- TOC -->

- [Status of this Document](#status-of-this-document)
- [Motivation](#motivation)
- [Use Cases](#use-cases)
- [Manifest Example](#manifest-example)
- [How Other Applications Register for URL Handling](#how-other-applications-register-for-url-handling)
  - [Windows](#windows)
  - [Linux](#linux)
  - [Mac](#mac)
- [Handling Multiple Registrations](#handling-multiple-registrations)
  - [Different apps registering the same protocol](#different-apps-registering-the-same-protocol)
  - [Same app registering multiple protocols](#same-app-registering-multiple-protocols)
- [Other Scenarios](#other-scenarios)
  - [Custom protocol URL is used as an &lt;iframe>](#custom-protocol-url-is-used-as-an-iframe)
  - [Non user-initiated navigation attempt](#non-user-initiated-navigation-attempt)
  - [App updates and handler registration](#app-updates-and-handler-registration)
- [PWA Launch and Context Passing](#pwa-launch-and-context-passing)
- [Related APIs](#related-apis)
  - [registerProtocolHandler](#registerprotocolhandler)
  - [protocol_handlers for WebExtensions](#protocol_handlers-for-webextensions)
- [Alternatives Considered](#alternatives-considered)
  - [Have `protocol_handlers` extend `registerProtocolHandler` with additional data](#have-protocol_handlers-extend-registerprotocolhandler-with-additional-data)
- [Security Considerations](#security-considerations)
  - [Handler Registration and App Launch](#handler-registration-and-app-launch)
- [Privacy Considerations](#privacy-considerations)
- [Open Questions](#open-questions)

<!-- /TOC -->

## Authors

Fabio Rocha (<farocha@microsoft.com>)
Connor Moody (<comoody@microsoft.com>)
Samuel Tang (<samtan@microsoft.com>)

## Status of this Document

This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

- This document status: **Active**
- Expected venue: [Web Applications Working Group](https://www.w3.org/2019/webapps/)
- Current version: this document

## Motivation

Developers can create a more engaging native-like experience if we allow Progressive Web Apps to be registered as handlers for URL protocols (aka schemes). Today, native applications can register themselves as protocol handlers, and HTML5 exposes a JavaScript API `registerProtocolHandler` for web sites to do the same, but it is desirable to offer registration as part of a PWA installation through its manifest.

After registering a PWA as a protocol handler, when a user clicks on a hyperlink with a specific scheme such as `mailto://` , `ms-word://` or `web+music://` from a browser or a native app, the registered PWA would open and receive the URL.

It is important to note that both the manifest-based registration proposed in this explainer and `registerProtocolHandler` play very similar roles in practice, while still allowing the possibility for subtle but complementary user-experiences.

Similarities include requirements around the list of schemes allowed to be registered (as discussed in the security section below), name and format of parameters, etc.

There are subtle differences in the manifest-based registration, however, that might be useful to enhance the experience for PWA users. For example, manifest-based registrations could loosen some requirements that currently apply to `registerProtocolHandler`. For instance, the need of user interaction for a website to register to handle a certain protocol might not apply to manifest-based PWA registration, as when a user intentionally installs a PWA there's an implicit level of trust involved that installation-related things will occur, including the registration of protocol handlers. This could also mean that the user doesn't need to be notified that a new protocol handler has been registered, as currently happens when `registerProtocolHandler` is used, and instead we could rely on solutions that let the user know what will happen before installation, such as an install time permissions prompt, to convey that protocols handlers will be registered.

## Use Cases

- Cross app integration. A user opens a document using a PWA. The document contains a link to a presentation (`ms-powerpoint://deck2378465`). When the user clicks on it, the presentation PWA automatically opens in the correct scope and shows the slide deck.

- In a native chat app, the user receives a link to some `magnet://` URL. When she clicks the link, an installed torrent PWA is launched.

- A user has installed a PWA for a music app. When a friend shares a link to a song and she clicks on it (`web+music://songid=1234&time=0:13`) the PWA will automatically launch instead of opening a new tab in the browser.

## Manifest Example

In this example, a Web App Manifest declares that the app should be registered to handle the protocols `web+jngl` and `web+jnglstore`.

```json
{
  "name": "Jungle",
  "description": "A plant encyclopedia",
  "protocol_handlers": [
    {
      "protocol": "web+jngl",
      "url": "/lookup?type=%s"
    },
    {
      "protocol": "web+jnglstore",
      "url": "/shop?for=%s"
    }
  ],
  "icons": [
    {
      "src": "images/icons-44.png",
      "type": "image/png",
      "sizes": "44x44"
    },
    {
      "src": "images/icons-144.png",
      "type": "image/png",
      "sizes": "144x144"
    },
    {
      "src": "images/icons-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
  ],
  "background_color": "#007f87",
  "display": "standalone",
  "start_url": "/",
}
```

A developer can add a field in the manifest.json to declare which protocols the web app can handle. As seen in the example above, the key is named `protocol_handlers` and it contains an array of protocol handler declaration objects.

These are the fields for each protocol handler:

| Field      | Required / Optional | Description                                                                                                                                                   | Default |
|:-----------|:--------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------|:--------|
| `protocol` | Required            | Protocol to be handled. E.g.: `mailto`, `ms-word`, `web+jngl`.                                                                                                | N/A     |
| `url`      | Required            | HTTPS URL within the application scope that will handle the protocol. The `%s` token will be replaced by the URL starting with the protocol handler's scheme. | N/A     |

## How Other Applications Register for URL Handling

All URLs begin with a scheme name followed by a colon (e.g.: `https:`). Custom URL schemes let the user open apps by clicking hyperlinks. URLs can be invoked by a browser, PWA, or native application.

Registering applications to handle URL schemes is operating system dependent. This association is usually done during application installation but it can also be done afterwards for an app that has already been installed. Chromium already contains code to register protocol handlers with the operating system as a part of its installer and its handling of the HTML5 `registerProtocolHandler` API. See `DefaultProtocolClientWorker::SetAsDefaultImpl` for details.

### Windows

- **Desktop applications** can be registered to handle URL schemes by modifying registry key values. See more [here](https://docs.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/aa767914(v=vs.85)?redirectedfrom=MSDN).

- **UWP apps** can specify a supported schemes in their package manifest. The OS registers these associations during installation. Read more [here](https://docs.microsoft.com/en-us/windows/uwp/launch-resume/handle-uri-activation).

### Linux

On Linux, Chromium's `SetAsDefaultProtocolClient` function relies upon the utility `xdg-settings`.

### Mac

On Mac, Chromium's `SetAsDefaultProtocolClient` function calls the API `LSSetDefaultHandlerForURLScheme`.

## Handling Multiple Registrations

### Different apps registering the same protocol

  Multiple applications might register themselves as handlers for the same scheme. For example, a user might install multiple mail clients that register for the `mailto://` protocol. In such cases, it is up to the OS to allow the user decide which app they want to open.

  On Windows, a prompt is shown with all the installed programs that can handle that protocol.

  ![Windows resolver](images/windowsresolver.png)

### Same app registering multiple protocols

  A developer might wish to register for multiple protocols with unique (or common) launch URLs.

- The UWP app for Office is registered to handle both `ms-officeapp` and `ms-getoffice`.
- The Microsoft News UWP app is registered to handle `msnews` and `msnnews`.
- The Xbox Console Companion app is registered to handle `xbox`, `xbox-captures`, `xbox-friendfinder`, `xbox-settings`, etc.

## Other Scenarios

### Custom protocol URL is used as an &lt;iframe>

This should be disallowed to prevent apps from automatically opening when the iframe source URL is loaded. The same should apply to other mechanisms that allow URL loading, e.g., `<img>`.

In some User Agents (e.g.: Chromium for Desktop), however, that doesn't seem to be the current behavior for custom handlers registered via registerProtocolHandler. Websites are able to be loaded in iframes if they're registered as the handlers for an iframe src that uses a protocol handler. User agents might want to implement the same behavior for these two scenarios.

### Non user-initiated navigation attempt

Similar to our recommendation for iframes above, we believe opening apps on non user-initiated navigation should be disallowed to prevent user confusion (e.g.: why does navigating to a website open an app?) and popup clutter.

### App updates and handler registration

Handler registrations must be synchronized with the latest manifest version provided via app update. The expected behavior of this scenario is:

1) An update that adds new handlers triggers handler registration (separate from app installation).
2) An update that removes handlers triggers handler unregistration (separate from app uninstallation).

Failing to account for handlers removed from a manifest during an app update would leave untracked handlers on a machine and have privacy and security implications.

## PWA Launch and Context Passing

Opening the selected app is the first step. In the common case, the target URL will be supplied as a query param in the app's HTTPS URL. For example, the hyperlink `web+jngl:cacao-tree` would open the Jungle PWA to `jungleapp.com/lookup?type=web%2Bjngl%3Acacao-tree`.

Alternatively, it may be desirable to supply the URL as part of the [Launch Events](https://github.com/WICG/sw-launch/blob/master/explainer.md).

## Related APIs

### registerProtocolHandler

As mentioned before, the Navigator interface from WebAPI has the method `registerProtocolHandler` that allows web sites register as handlers of particular URL schemes.

<https://html.spec.whatwg.org/multipage/system-state.html#custom-handlers>

<https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler>

### protocol_handlers for WebExtensions

Another related API is Mozilla's `protocol_handlers` property for their [WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/protocol_handlers). With that property, extensions can register a website as a handler for a particular protocol. Just like in this proposal, the syntax and semantics of this `WebExtensions` property is very similar to `registerProtocolHandler`, except that with `registerProtocolHandler` a website can only register itself as a handler. To avoid confusion for developers, it would be wise to keep the extensions API ([Chromium proposal](https://bugs.chromium.org/p/chromium/issues/detail?id=64100)), the web app API (proposed here) and `registerProtocolHandler` as aligned as possible. Keeping compatibility with all these APIs might also make it easier for user agents to share as much logic as possible among all the implementations. [Issue #280](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/280) provides more context on this.

## Alternatives Considered

### Have `protocol_handlers` extend `registerProtocolHandler` with additional data

[Issue #286](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/286) suggested an alternative where "this manifest addition serves to just 'enhance' the existing register protocol handler API." and where "the website still has to use the existing API". For instance, it could supplement the existing API with icons and other data that would be useful in an App context, but not as useful in a web site context.

Even though the author of the issue lists several good reasons as to why this could be an interesting alternative, this option will not be pursued because we believe this will not be ergonomic enough for developers. We could not find good examples on the web app space where manifest properties depend on calls to existing HTML5 APIs and having a dependency on that API being called at some point in time would work against the goal of having an app being able to handle protocols immediately after being installed.

Having the APIs interact with each other would also cause confusion with regards to the order of API calls: "Do I first call `registerProtocolHandler` and then install the app, or the other way around?", "If I uninstall the app and install it again, do I need to have the API called again?", etc. There's also plans to have `protocol_handlers` supported in [browser extensions](https://bugs.chromium.org/p/chromium/issues/detail?id=64100), and coming up with logical interactions for 3 registration scenarios would be even more confusing for developers.

## Security Considerations

Registering a protocol handler represents an important state change in the user's operating environment, and we must work to ensure that it is not abused.

The `registerProtocolHandler` API implements an allow list of schemes that may be registered; we should start with that same restriction and evaluate whether it meets the needs, but possibly adding a few schemes to the list.

URLs may contain sensitive user data; because PWAs require a secure context (HTTPS), invocation of a protocol handler will take place in a secure context. However, PWAs that implement protocol handlers must still take care to avoid sending potentially-sensitive URL data over insecure channels.

We may want to cap the number of allowed protocols to a number N per manifest.

### Handler Registration and App Launch

To provide a smooth install experience, protocol handlers will be registered with the OS silently as part of PWA installation, however, the following security mitigations will be implemented:

1. Registration of PWA protocol handlers won’t take over the default handler for a protocol. Instead, the next time the protocol is invoked, an OS disambiguation dialog will prompt the user to either keep using the default handler or select the newly registered handler.
2. On first launch (or potentially every launch) of the PWA due to an invoked protocol, the user will be presented with a permission dialog. This dialog will display the app name and origin of the app, and ask the user if the app is allowed to handle links from the protocol. If a user rejects the permission dialog, the protocol handler is unregistered with the OS.

On some OSs, a handler registered for an uncontested protocol automatically takes over as the default handler during registration. Though no OS disambiguation dialog will display in this case, the user will still give consent through launch time permission prompt.

## Privacy Considerations

A common concern for protocol handling APIs is that bad actors could try to enumerate which apps are registered as protocol handlers as a fingerprinting technique. One can imagine that a lot about a user can be revealed from which apps are installed to handle certain protocols (e.g. a ConservativeNews App or a SomeReligion App might register protocol handlers).

To prevent fingerprinting, we plan to follow the footsteps of the `registerProtocolHandler` by not exposing the list of protocol handlers to the web.

## Open Questions

> What ensures that registration through manifest will never conflict with a `registerProtocolHandler()` call from the PWA?

Just like when a protocol is registered to be handled by two different sites or apps, the current intent is that the user would have a way to indicate who should ultimately handle a protocol, the browser (via a website registered by `registerProtocolHandler`) or a PWA registered via a manifest `protocol_handlers` property. This functionality is currently exposed in `chrome://settings/content/handlers` and in similar OS interfaces that handle protocol registration.

This might not be the desired behavior, though, and needs to be thought about more carefully. One can imagine a scenario where a developer wants to control the experience and uses both registration mechanisms to indicate that if the user is currently navigating the web on the browser, the protocol is to be handled by the website, and if the user is outside the browser, the protocol is to be handled by the app.
