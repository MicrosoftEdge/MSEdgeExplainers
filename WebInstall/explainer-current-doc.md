# **Web Install API (_current document_)**

## Authors:

- [Diego Gonzalez](https://github.com/diekus),  [Microsoft](https://microsoft.com)

## Participate
- [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22Web%20Install%20API%22)
- [Discussion forum](https://github.com/w3c/manifest/pull/1175)

## Table of contents

- [Introduction](#introduction)
- [User facing problem](#user-facing-problem)
    - [Goals](#goals)
    - [Non-goals](#non-goals)
- [Use Case](#use-cases)
- [Proposed Approach](#proposed-approach)
    - [Sample code](#sample-code)
- [Alternatives considered](#alternatives-considered)
- [Accessibility, Privacy and Security Considerations](#accessibility-privacy-and-security-considerations)
- [Future work](#future-work)
- [Stakeholder feedback](#stakeholder-feedback--opposition)


## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Applications Working Group](https://www.w3.org/groups/wg/webapps/)
* **Current version: this document**

## Introduction

The **Web Install API provides a way to democratise and decentralise web application acquisition**, by enabling ["do-it-yourself" end users and developers](https://www.w3.org/TR/ethical-web-principles/#control) to have control over the application discovery and distribution process. It provides the tools needed to allow a web site to install a web app.

> **Note:** The Web Install API can be used to install the current loaded web app, as explained in this document. It can also be used to install other web apps. Refer to [this document](./explainer-background-doc.md) for the _background document_ functionality.

## User-facing problem

**End users don't have a standard, cross-platform way to acquire applications.** Users are usually faced with inconsistent, hidden and proprietary mechanisms (custom protocols, stores) to acquire applications.

The Web Install API aims to fix this issue by creating an open, ergonomic, standardized, and cross-platform supported way of acquiring applications.

The feature aims to benefit users that:
* might not know that a web app exists for the current origin.
* don't understand what the [icon/prompt in the browser's address bar](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/ux#installing-a-pwa) does.
* don't know how to [deep search several layers](https://support.google.com/chrome/answer/9658361?hl=en-GG&co=GENIE.Platform%3DDesktop&oco=1) [of browser UX to add the app](https://support.apple.com/en-us/104996#create) to their devices.
* don't use app stores to discover new app experiences.

### Goals

* **Enable installation of the _current_ loaded web app.**
* Complement [`beforeinstallprompt`](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent) for platforms that do not prompt for installation of web content.
* Enable UAs to [suppress potential installation-prompt spam](#avoiding-installation-prompt-spamming).

### Non-goals

* Install arbitrary web content that is not an app (target must have a manifest file or [processed manifest `id`](#glossary)). [Reasons expanded here](https://docs.google.com/document/d/19dad0LnqdvEhK-3GmSaffSGHYLeM0kHQ_v4ZRNBFgWM/edit#heading=h.koe6r7c5fhdg).
* Change the way the UA currently allows installation of a web app.
* Define what "installation" means. This is up to each platform and overall we refer to the acquisition of an app onto a device.

## Use cases

Installation of a _current document_ is when the install API is invoked to install the web application located at the web page in the UA's current navigation context. This enables the following use case (among others):

### **Websites installing their web apps**

Picture a user browsing on their favorite video streaming web app. The user might browse to this web app daily, yet not be aware that there is a way that they can install the app directly from the app's UI (or that that specific web site has an app altogether). This could be through a button that the webapp would be able to implement, that would trigger the installation.

![Same domain install flow](./samedomaininstall.png) 

## Proposed approach

As exemplified in the [use case](#use-cases), an end user can be browsing the web, and a web application can present UX to [acquire](#web-application-acquisition) "itself". We propose an open, ergonomic and standard way of acquiring web applications that enables end users to easily and safely install content on their devices. The proposed approach is a new API in the shape of  promise-based method `navigator.install();`. This promise will:

* Resolve when an installation was completed.
    * The success value will be an object that contains:
        *  `id`: string with the processed `manifest_id` of the installed app.
* Be rejected if the app installation did not complete. It'll reject with a [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) value of:
    * `AbortError`: The installation/UX/permission (prompt) was closed/cancelled.
    * `DataError`: There is no manifest file present, there is no `id` field defined in the manifest. 

The proposal extends the `navigator` interface with the `install` method. To install the _current_ document/loaded web app, it must have a link to a manifest file and an `id` value defined in said manifest file. Having an `id` in the installed app allows to avoid certain [pitfalls when updating the app](https://docs.google.com/document/d/19dad0LnqdvEhK-3GmSaffSGHYLeM0kHQ_v4ZRNBFgWM/edit#heading=h.koe6r7c5fhdg).


### Steps to install the app

1. User gesture activates code that calls the `install()` method. 
2. If current document has a manifest file, continue. Else reject with `DataError`.
3. If manifest file has an `id` field defined, continue. Else reject with `DataError`.
4. UA shows the acquisition/installation confirmation UX (prompt/dialog). If the user accepts, continue. Else reject with `AbortError`. 
7. Promise resolves with processed `id` of installed app and application follows the platform's post-install UX (adds to Dock/opens app/adds to mobile app drawer).


> **Note:** if an application is installed, the UA can choose to display UX to launch this application. The behaviour for this case is the same as if the app is not installed: The promise would resolve if the application opens, and rejects otherwise, with an `AbortError`.

There is an [open PR](https://github.com/w3c/manifest/pull/1175) to add this to the Manifest spec.

### Web application acquisition
As defined in the [non-goals](#non-goals) section, the concept of what "installation" means can vary per browser and platform. These are the current behaviours on some browsers that can represent acquiring an app or "installing" it:
- Apple's Safari allows a user to [add (web content) to dock](https://support.apple.com/en-us/104996#create).
- Chromium browsers can [prompt a user to "install" a web app](https://web.dev/learn/pwa/installation/) to the system.
- Mozilla Firefox on mobile allows to [add web content to the home screen](https://support.mozilla.org/en-US/kb/add-web-page-shortcuts-your-home-screen).

The main benefit of "installation" for the end user is that they can experience their web applications with better UX, including easier access through icons/app drawer/dock integrations and better/advanced platform integrations like sharing, notifications and others. 

### Sample code

```javascript
/* tries to install the current document */
const installApp = async () => {
    if (!navigator.install) return; // api not supported
    try {
        await navigator.install();
    } catch(err) {
        switch(err.name){
            case 'AbortError':
                /* Operation was aborted*/
                break;
        }
    }
};
```

## Alternatives considered

### Declarative install

An alternate solution is to have a declarative way to install web apps. This can be achieved by allowing a new `target` type of `_install` to the HTML anchor tag. It can also use the [`rel`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel) attribute to hint to the UA that the url in the link should be installed.

`<a href="https://airhorner.com" target="_install">honk</a>`

`<a href="https://airhorner.com" rel="install">honk</a>`

*Pros:*
* Platform fallback to navigate to the content automatically.
* Does not need JavaScript.

*Cons:*
* Takes the user out of the current context, providing no alternative if the use case benefits from them staying in context.
* Limits the amount of information a developer can act upon that the promise provides, such as if the installation was successful.
* Developers can't easily detect UA declarative support in order to be able to tailor their UX to different situations.

* More complex combinations for the UA to take into account: additional attributes that act on a link HTML tag (`a`) like the target mean there is an increased set of scenarios that might have unintended consequences for end users. For example, how does a target of `_ top` differ from `_blank`? While we could look at ignoring the `target` attribute if a `rel` attribute is present, the idea is to use acquisition mechanisms that are already present in UAs. 

We believe that a declarative implementation is a simple and effective solution, and a future entry point for the API. It should be considered for a v2 of the capability. For the current solution, we've decided to go with an imperative implementation since it allows more control over the overall installation UX:
* Allows the source to detect if an installation occurred with ease. (resolves/rejects a promise).
* Supports `install_url`. This url can be an optimized url or the normal homepage that an application already has. The advantage is that unlike a declarative version, there is no scenario where an end user can be left stranded accidentally in a blank page that is meant to be a lightweight entry point to the app.

* The developer ergonomics of handling a promise are better than responding to an `a` tag navigation.
* Keeps the user in the context, which *can* be beneficial in certain scenarios (importantly, if the developer *wants* to take the user out of the current context, they *can* do so by navigating).

### PEPC version of the API

A version of Web Install that switches the permission prompt for a [PEPC](https://github.com/WICG/PEPC/blob/main/explainer.md) element is considered. While we remain enthusiastic about PEPC, we prefer to be cautious in its adoption and support until the feature ships and there is commitment to ship from more browser engines.

The main benefit from this alternative would be a clearer user intent on a UX surface controlled by the UA. This can mitigate spoofing and spamming with a dedicated DOM element to install web apps, and we are observing its development and considering it for [future work](#future-work).

## Accessibility, Privacy, and Security Considerations

### Same-origin policy
* The installed content is the same origin therefore shares the same permissions already granted to that origin. Installation does not alter or grant any permissions.

### Preventing installation prompt spamming from third parties

* This API can only be invoked in a top-level navigable and be invoked from a [secure context](https://w3c.github.io/webappsec-secure-contexts/).

* The biggest risk for the API is installation spamming. To minimize this behaviour, installing a PWA using the Web Install API requires [transient activation](https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event).

### Feature does not work on Incognito or private mode
The install capability should not work on off-the-record profiles, including _incognito_ and guest modes, and the promise should always reject if called in a private browsing context. 

### Rejecting promise with limited existing `DOMException` names

To protect the user's privacy, the API does not create any new error names for the `DOMException`, instead it uses common existing names: `AbortError`, `DataError`, `NotAllowError` and `InvalidStateError`. This makes it harder for the developer to know if an installation failed because of a mismatch in id values, a wrong manifest file URL or if there is no id defined in the manifest.

* The promise will reject with an `AbortError` if:
    * The install permission is required but hasn't been granted.
    * Installation was closed/cancelled.
* The promise will reject with a `DataError` if:
    * No manifest file present or invalid install URL.
    * No `id` field defined in the manifest file.
* The promise will reject with an `NotAllowedError` if:
    * Invocation happens without a user activation.
* The promise will reject with an `InvalidStateError` if:
    * User is outside of the main frame.

## Future Work

- A [declarative version](#declarative-install) of the Install API is also possible to be part of a future version of the API. This provides another entry point to the install capability.
- A version of [Web Install that uses PEPC](#pepc-version-of-the-api) instead of the current permission model is an interesting idea as future work, pending the evolution and shipment of the PEPC proposal.

## Stakeholder Feedback / Opposition / FAQs

Refer to [this document](./faq.md) for stakeholder feedback for the Web Install API.

## References & acknowledgements

This explainer takes on a reimagination of a capability [previously published by PEConn](https://github.com/PEConn/web-install-explainer/blob/main/explainer.md).

Throughout the development of this capability we've revceived a lot of feedback and support from lots of people. We've like to give a special thanks to Daniel Appelquist, Amanda Baker, Marcos Cáceres, Lu Huang, Kristin Lee, Daniel Murphy, Alex Russell and Howard Wolosky for their input.

## Feedback
For suggestions and comments, please file an [issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=diekus&labels=Web+Install+API&projects=&template=web-install-api.md&title=%5BWeb+Install%5D+%3CTITLE+HERE%3E).

![Web Install logo](installlogo.png)