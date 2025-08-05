# **Web Install API (Current document)**
Authors: [Diego Gonzalez](https://github.com/diekus)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Applications Working Group](https://www.w3.org/groups/wg/webapps/)
* **Current version: this document**

> **Note: The work on Web Install has been separated into two explainers: current and background document installations. The 'current document' installation refers to installation of the curently loaded web application and is [being discussed](https://github.com/w3c/manifest/pull/1175) in the Web Applications WG. The 'bakground document' installation refers to installation of web applications different from the current loaded navigable. Background document installations are being discussed and incubated in WICG.**

##  Introduction

As Web applications are becoming more ubiquitous, there are growing needs to aid discovery and distribution of said applications. **The Web Install API provides a way to democratise and decentralise web application acquisition**, by enabling ["do-it-yourself" developers to have control](https://www.w3.org/TR/ethical-web-principles/#control) over the application discovery and distribution process, providing them with the tools they need to allow a web site to install a web app. This means end users have the option to more easily discover new applications and experiences that they can acquire with reduced friction.

The acquisition of a web app can originate via multiple user flows that generally involve search, navigation, and ultimately trust that the UA will prompt or provide some sort of UX that support "[installing](https://web.dev/articles/install-criteria)/[adding](https://support.apple.com/en-gb/guide/safari/ibrw9e991864/mac)" the desired app. There are multiple use cases for this feature, as seen in the [use case](#use-cases) section, but *the core concept is the installation of a web app directly from a web page*.

The Web Install API **aims to standardize the way installations are invoked by *end users***, creating an ergonomic, simple and consistent way to get web content installed onto a device. The current "alternatives" to the Web Install API expect/require the user to rely on search engines, app stores, proprietary protocols, proprietary "smart" banners, UA prompts, hidden UX and other means that take the user out of their navigating context. They also represent additional steps towards the acquisition of the app.

Inherently, these alternative user flows to "install" an app rely on multi-step processes that at best require a couple of clicks to navigate to an origin and install it, and at worst involve the user searching on browser menus for a way to add the app to their device. The web platform is not currently capable of providing a seamless, consistent experience that allows users to discover and acquire applications in a frictionless manner. Every additional step in the acquisition funnel for web apps comes with an additional drop off rate as well. 

Moreover, the **Web Install API feature is beneficial for app discovery**: it allows developers to provide a consistent funnel to all their users, regardless of their UA or platform. Developers can tailor their app acquisition to **benefit users that:**
* might not know that a web app exists for the current origin.
* don't understand what the icon/prompt in the omnibox does.
* don't know how to deep search several layers of browser UX to add the app to their devices.
* don't use app stores to discover new app experiences.

## Goals

* **Enable installation of _current document_ web apps.**
* Allow the web app to report to the installation origin the outcome of the installation.
* Complement `beforeinstallprompt` for platforms that do not prompt for installation of web content.
* Enable UAs to [suppress potential installation-prompt spam](#avoiding-installation-prompt-spamming).
* Track campaign IDs for marketing campaigns (with the [Acquisition Info API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AcquisitionInfo/explainer.md)).

## Non-goals

* Install arbitrary web content that is not an app (target must have a manifest file or [processed manifest `id`](#glossary)). [Reasons expanded here](https://docs.google.com/document/d/19dad0LnqdvEhK-3GmSaffSGHYLeM0kHQ_v4ZRNBFgWM/edit#heading=h.koe6r7c5fhdg).
* Change the way the UA currently prompts for installation of a web app.
* Associate ratings and reviews with the installed app ([see Ratings and Reviews API explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/RatingsAndReviewsPrompt/explainer.md)).
* Process payments for installation of PWAs ([see Payment Request API](https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API)).
* List purchased/installed goods from a store ([see Digital Goods API](https://github.com/WICG/digital-goods/blob/main/explainer.md)).
* Installing content that does not pass the installability criteria (see *[installability criteria](#installability-criteria)*).
* Define what "installation" means. This is up to each platform and overall we refer to the acquisition of an app onto a device.

## Use Cases

The Web Install API enables installation of web applications. An abstraction of the way the API is used is that a website will be able to include a button to install an application. This unfolds to 2 distinct scenarios that define all user cases: installation of the *current document* (currently being discussed in the WebApps WG), and installation of a *background document* (not in scope of this explainer and currently being incubated in WICG).

**Current Document Installations**

Installation of the current document is when the install API is invoked to install the web application located at the web page in the UA's current navigation context. This enables the following use case (among others):

### **Websites installing their web apps**

Picture a user browsing on their favorite video streaming web app. The user might browse to this web app daily, yet not be aware that there is a way that they can install the app directly from the app's UI (or that that specific web site has an app altogether). This could be through a button that the webapp would be able to implement, that would trigger the installation.

![Same domain install flow](./samedomaininstall.png) 

## Proposed Solution

### The `navigator.install` method

To install a web app, a web site would use the promise-based method `navigator.install();`. This method will:

* Resolve when an installation was completed.
    * The success value will be an object that contains:
        *  `id`: string with the processed `manifest_id` of the installed app.
* Be rejected if the app installation did not complete. It'll reject with a [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) value of:
    * `AbortError`: The installation/UX/permission (prompt) was closed/cancelled.
    * `DataError`: There is no manifest file present, there is no `id` field defined in the manifest. 


#### **Signature of the `install` method**
The Web Install API consists of the extension to the navigator interface with an `install` method.

##### **Zero parameters `navigator.install()`**

This signature of the method does not require any parameters. This is a simple and ergonomic way to install the [current document](#current-document). Since the document is already loaded, all the required information to install the application is already available.

*Requirements:*
* The current document must link to a manifest file.
* The manifest file must have an `id` value defined.

### **Installing the web app**

To install an application with the Web Install API, the process is as follows:

#### Current Document

1. User gesture activates code that calls the `install()` method. 
2. If current document has a manifest file, continue. Else reject with `DataError`.
3. If manifest file has an `id` field defined, continue. Else reject with `DataError`.
4. UA shows the acquisition/installation confirmation UX (prompt/dialog). If the user accepts, continue. Else reject with `AbortError`. 
7. Promise resolves with processed `id` of installed app and application follows the platform's post-install UX (adds to Dock/opens app/adds to mobile app drawer).

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

### Installing an *already* installed application

In the case that the `navigator.install` method is invoked to install an application that is already installed in the device, it is up to the UA to decide the relevant default behaviour. For example, the UA can choose to open (or ask to open) the app.  
* The promise will resolve if the application opens.
* The promise rejects otherwise, with an `AbortError`.

### *Launching* an application

If an application is already installed, the `.install()` method can trigger UX in the UA to launch an application. **This is not obvious to the developer, as the UX flow will behave and report identically of installing/opening the app.**

## Installability criteria & Web app manifest `id`
To install content using the Web Install API, the _document being installed_ must have a manifest file. In an ideal scenario the manifest file has an `id` key/value defined, but in either case the processed web app manifest `id` will serve as the installed application's unique identifier. Any other requirement to pass 'installability criteria' is up to each implementor.

The importance of `id`s for installed content is to avoid cases where multiple *same* apps are installed with no way to update them. More details can be found in [this document](https://docs.google.com/document/d/19dad0LnqdvEhK-3GmSaffSGHYLeM0kHQ_v4ZRNBFgWM/edit#heading=h.koe6r7c5fhdg).

>**Note:** There is no other requirement regarding what can be installed with the API and this requirement does not interfere with other affordances that some UAs have to add any content to the system/OS. This is, the UA can still allow the end user to install any type of content from a menu or prompt that follows different requirements than this API.

## Privacy and Security Considerations

### Same-origin policy
* The installed content is the same origin therefore shares the same permissions already granted to that origin. Installation does not alter or grant any permissions. 

> **Note:** any application installed with the `install` method will have to ask for permissions (if any) when the user opens and interacts with the application.

### Preventing installation prompt spamming from third parties

* This API can only be invoked in a top-level navigable and be invoked from a [secure context](https://w3c.github.io/webappsec-secure-contexts/).

* The biggest risk for the API is installation spamming. To minimize this behaviour, installing a PWA using the Web Install API requires a [user activation](https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event).

### Rejecting promise with limited existing `DOMException` names

To protect the user's privacy, the API does not create any new error names for the `DOMException`, instead it uses common existing names: `AbortError`, `DataError`, `NotAllowError` and `InvalidStateError`. This makes it harder for the developer to know if an installation failed because of a mismatch in id values, a wrong manifest file URL or if there is no id defined in the manifest.

**The promise will reject with an `AbortError` if:**
* Installation was closed/cancelled.

**The promise will reject with a `DataError` if:**
* No manifest file present or invalid install URL.
* No `id` field defined in the manifest file.

**The promise will reject with an `NotAllowedError` if:**
* The install permission is required but hasn't been granted.

**The promise will reject with an `InvalidStateError` if:**
* User is outside of the main frame.
* Invocation happens without a user activation.

### **Feature does not work on Incognito or private mode**
The install capability should not work on *incognito*, and the promise should always reject if called in a private browsing context. 

**The user gesture and the final installation confirmation (current default behaviour in the browser before installing an app) work together to minimize the risk of origins spamming the user for unrequested installations**, give developers flexibility to control the distribution of their apps and end users the facility to discover and acquire content in a frictionless way.

## Considered Alternative Solutions

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

Having stated this, we believe that a declarative implementation is a simple and effective solution, and a future entry point for the API. It should be [considered for a v2](#future-work) of the capability. For the current solution, **we've decided to go with an imperative implementation since it allows more control over the overall installation UX**:
* Allows the source to detect if an installation occurred with ease. (resolves/rejects a promise).
* Supports `install_url`. This url can be an optimized url or the normal homepage that an application already has. The advantage is that unlike a declarative version, there is no scenario where an end user can be left stranded accidentally in a blank page that is meant to be a lightweight entry point to the app.

* The developer ergonomics of handling a promise are better than responding to an `a` tag navigation.
* Keeps the user in the context, which *can* be beneficial in certain scenarios (importantly, if the developer *wants* to take the user out of the current context, they *can* do so by navigating).


## Open Questions

* Should we have custom error types like `IDMismatchError`?

  No, we are grouping all error cases into 2 different errors (`DataError` and `AbortError`). This will reduce the possibility for a bad actor to determine if a user was logged-in to a site that has a manifest behind a login. It also complicates knowing the reason why an application's installation fails. 

* Should we allow an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to enable cancelling the installation if the process takes too long?

* Can we remove power from the developer to query if the app is installed by offloading to the UA the knowledge of which apps are installed?
  * Is there any form of attribute that can be added to a DOM element to signal this distinction/difference?

## Future Work

This API is the first step in allowing the Web platform to provide application lifecycle management. Related future work might include the capability to know which apps have been installed and a way to uninstall applications.

A [declarative version](#declarative-install) of the Install API is also possible to be part of a future version of the API. This provides another entry point to the install capability.

## Glossary

* **UA:** user agent.
* **UX:** user experience.
* **`id`:** identifier. depending on the context it refers to the field in the manifest file or the `processed id`.
* **`<install_url>`:** [parameter](#signatures-of-the-install-method) for the install method for an URL to the install document that has the manifest file of the app to install.
* **`<manifest_id>`:** [parameter](#signatures-of-the-install-method) for the install method that represents a processed id.
* **`processed (manifest) id`:** The resulting `id` string after it has been [processed](https://www.w3.org/TR/appmanifest/#example-resulting-ids) according to the manifest specification.

## Acknowledgements

This explainer takes on a reimagination of a capability [previously published by PEConn](https://github.com/PEConn/web-install-explainer/blob/main/explainer.md).

Throughout the development of this capability we've revceived a lot of feedback and support from lots of people. We've like to give a special thanks to Amanda Baker, Kristin Lee, Marcos Cáceres, Daniel Murphy, Alex Russell, Howard Wolosky, Lu Huang and Daniel Appelquist for their input.

## Feedback
For suggestions and comments, please file an [issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=diekus&labels=Web+Install+API&projects=&template=web-install-api.md&title=%5BWeb+Install%5D+%3CTITLE+HERE%3E).

![Web Install logo](installlogo.png)