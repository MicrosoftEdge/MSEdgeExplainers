# **Web Install API**
Authors: [Diego Gonzalez](https://github.com/diekus)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Applications Working Group](https://www.w3.org/groups/wg/webapps/)
* **Current version: this document**

##  Introduction

As Web applications are becoming more ubiquitous, there are growing needs to aid discovery and distribution of said applications. **The Web Install API provides a way to democratise and decentralise web application acquisition**, by enabling ["do-it-yourself" developers to have control](https://www.w3.org/TR/ethical-web-principles/#control) over the application discovery and distribution process, providing them with the tools they need to allow a web site to install a web app. This means end users have the option to more easily discover new applications and experiences that they can acquire with reduced friction.

The acquisition of a web app can originate via multiple user flows that generally involve search, navigation, and ultimately trust that the UA will prompt or provide some sort of UX that support "[installing](https://web.dev/articles/install-criteria)/[adding](https://support.apple.com/en-gb/guide/safari/ibrw9e991864/mac)" the desired app. There are multiple use cases for this feature, as seen in the [use case](#use-cases) section, but *the core concept is the installation of a web app directly from a web page*.

The Web Install API **aims to standardize the way installations are invoked by *end users***, creating an ergonomic, simple and consistent way to get web content installed onto a device. The current "alternatives" to the Web Install API expect/require the user to rely on search engines, app stores, proprietary protocols, proprietary "smart" banners, UA prompts, hidden UX and other means that take the user out of their navigating context. They also represent additional steps towards the acquisition of the app.

Inherently, these alternative user flows to "install" an app rely on multi-step processes that at best require a couple of clicks to navigate to an origin and install it, and at worst involve the user searching on browser menus for a way to add the app to their device. The web platform is not currently capable of providing a seamless, consistent experience that allows users to discover and acquire applications in a frictionless manner. Every additional step in the acquisition funnel for web apps comes with an additional drop off rate as well. 

Moreover, the **Web Install API feature is beneficial for app discovery**: it allows developers to create their own acquisition mechanism and tailor it to **benefit users that:**
* might not know that a web app exists for the current origin.
* don't understand what the icon/prompt in the omnibox does.
* don't know how to deep search several layers of browser UX to add the app to their devices.
* don't use app stores to discover new app experiences.

## Goals

* **Enable installation of web apps.**
* Allow the web app to report to the installation origin the outcome of the installation.
* Complement `beforeinstallprompt` for platforms that do not prompt for installation of web content.
* Enable UAs to [supress potential installation-prompt spam](#avoiding-installation-prompt-spamming).
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

The Web Install API enables installation of web applications. An abstraction of the way the API is used is that a website will be able to include a button to install an application. This unfolds to 2 distinct scenarios that define all user cases: installation of the *current document*, and installation of a *background document*.

**Current Document**

Installation of the current document is when the install API is invoked to install the web application located at the web page in the UA's current navigation context.

**Background Document**

Installation of the background document is when the install API is invoked to install a web application different from the navigation context the API is called from. The app that will be installed can be in the same or a different origin.

These two scenarios enable the following use cases (among others):

### **Websites installing their web apps**

Picture a user browsing on their favorite video streaming web app. The user might browse to this web app daily, yet not be aware that there is a way that they can install the app directly from the app's UI (or that that specific web site has an app altogether). This could be through a button that the webapp would be able to implement, that would trigger the installation. 

> **Note:**
> This is enabled by the installation of the *current document*.

![Same domain install flow](./samedomaininstall.png) 

### **Suite of Web Apps**

Building on the previous use case, the website can also provide a way to directly acquire other applications it might offer, like a dedicated "kids" version of the app, or a "sports" version of the app. Another example would be a family of software applications, like a productivity or photography suite, where each application is accessed from a different web page. The developer is in control and can effectively advertise and control their applications, without having to redirect users to platform-specific proprietary repositories, which is what happens now.


> **Note:**
> This is enabled by the installation of a *background document*.

### **SERP app install**

Developers of Search Engines could use the API to include a way to directly install an origin that is an application. A new feature could be offered by search engines that could see them facilitating a frictionless way to acquire an app that a user is searching for. This could also aid discovery as a user might not be aware that a specific origin has an associated web application they could acquire. 

> **Note:**
> This is enabled by the installation of a *background document*.

### **Creation of online catalogs**

 Another potential use case for the API is related to the creation of online catalogs. A web site/app can list and install web apps. A unique aspect of this approach is that since the applications that are installed are web apps, this could enable a new set of true cross-device, cross-platform app repositories. 
 
 > **Note:**
>This is enabled by the installation of a *background document*.

  ![Install flow from an app repository](./apprepositoryinstallation.png)

## Proposed Solution

### The `navigator.install` method

To install a web app, a web site would use the promise-based method `navigator.install([<install_url>[, <manifest_id>[, <params>]]]);`. This method will:

* Resolve when an installation was completed.
    * The success value will be an object that contains:
        *  `id`: string with the processed `manifest_id` of the installed app.
* Be rejected if the app installation did not complete. It'll reject with a [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) value of:
    * `AbortError`: The installation/UX/permission (prompt) was closed/cancelled.
    * `DataError`: There is no manifest file present, there is no `id` field defined in the manifest or there is a mismatch between the `id` passed as a parameter and the processed `id`. 


#### **Signatures of the `install` method**
The Web Install API consists of the extension to the navigator interface with an `install` method. This method has 3 different signatures that can be used in different scenarios. The possible parameters it may receive are:

* `install_url`: a url meant for installing an app. This url can be any url in scope of the manifest file that links to it. For an optimal user experience, it is recommended that developers use an `install_url` that does not redirect and only contains content that is relevant for installation purposes (essentially just a reference to the web manifest).
* `manifest_id`: declares the specific application to be installed. This is the unique id of the application that will be installed. This value must match the id specified in the manifest file to form the processed id once an application is installed.
* optional [parameters](#parameters).

The `manifest_id` is the *what* to install, the `install_url` is the *where* to find it.

Unless the UA decides to [gate this functionality behind installation](#gating-capability-behind-installation), the behaviour between calling the `install` method on a tab or on an installed application should not differ. 

##### **Zero parameters `navigator.install()`**

This signature of the method does not require any parameters. This is a simple and ergonomic way to install the [current document](#current-document). Since the document is already loaded, all the required information to install the application is already available.

*Requirements:*
* The current document must link to a manifest file.
* The manifest file must have an `id` value defined.

> **Note:** This signature can't install background documents. 

##### **One parameter `navigator.install(<install_url>)`**

This signature can be used to install the current or a background document. 

> **Note:** If installing the current document the `install_url` points to itself.

*Requirements:*
* `<install_url>` must be a valid URL.
* The document present at `<install_url>` must link to a manifest file.
* The manifest file linked in the document present at `<install_url>` must have an `id` value defined.

##### **Two parameters `navigator.install(<install_url>, <manifest_id>)`**

This signature is intended to install background documents that don't necessarily have an explicit `id` value defined in the manifest file.

*Requirements:*
* `<install_url>` must be a valid URL.
* The document present at `<install_url>` must link to a manifest file.
* The `<manifest_id>` parameter must match the processed string after processing the `id` member.

> **Note:** according to the manifest spec, if there is no `id` member present, the processed string resolves to that of the `start_url`.


##### **Optional Parameters**

The `navigator.install` call can receive an object with a set of parameters that specify different installation behaviours for the app. It is also a way to future-proof the API if additional data were required with the call.
* **referral-info**: this parameter takes the form of an object that can have arbitrary information required by the calling installation domain. This information can later be retrieved inside the installed application via the [Acquisition Info API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AcquisitionInfo/explainer.md).

> **Note:** Three signatures exist to accommodate all possibilities of existing apps. We acknowledge that only around 4% (as of 2024) of web apps have defined `id`s in their manifest. We also know that `id`s are a crucial part to support to avoid situations of multiple *same* applications with no path to being updated. For apps that have an `id` defined in their manifest, the 1 param signature is useful. For apps that do not define the `id` field, they can be installed with the 2 parameter signature. 

### **Installing the web app**

To install an application with the Web Install API, the process is as follows:

#### Current Document

1. User gesture activates code that calls the `install()` method. 
2. If current document has a manifest file, continue. Else reject with `DataError`.
3. If manifest file has an `id` field defined, continue. Else reject with `DataError`.
4. UA shows the acquisition/installation confirmation UX (prompt/dialog). If the user accepts, continue. Else reject with `AbortError`. 
7. Promise resolves with processed `id` of installed app and application follows the platform's post-install UX (adds to Dock/opens app/adds to mobile app drawer).

#### Background Document (1 param)

1. User gesture activates code that calls the `install(<install_url>)` method.
2. If the `<install_url>` is not the current document, the UA asks for permission to perform installations (it not previously granted). Else reject with `AbortError`. 
3. UA tires to fetch the background document present at the `<install_url>` and its manifest file.
4. If fetched document has a manifest file, continue. Else reject with `DataError`.
5. If manifest file linked to the fetched document has an `id` field defined, continue. Else reject with `DataError`.
6. UA shows the acquisition confirmation UX (prompt/dialog). If the user accepts, continue. Else reject with `AbortError`. 
7. Promise resolves with processed `id` of installed app and application follows the platform's post-install UX (adds to Dock/opens app/adds to mobile app drawer).

#### Background Document (2 param)

1. User gesture activates code that calls the `install(<install_url>, <manifest_id>)` method. 
2. If the `<install_url>` is not the current document, the UA asks for permission to perform installations. Else reject with `AbortError`. 
3. UA tires to fetch the background document present at the `<install_url>` and its manifest file.
4. If fetched document has a manifest file, continue. Else reject with `DataError`.
5. If `<manifest_id>` matches the processed `id` from the manifest of the fetched document, continue. Else reject with `DataError`.
6. UA shows the acquisition confirmation UX (prompt/dialog). If the user accepts, continue. Else reject with `AbortError`.
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

```javascript
/* tries to install a background document (app) */

const installApp = async (install_url, manifest_id) => {
    if (!navigator.install) return; // api not supported
    try {
        await navigator.install(install_url, manifest_id);
    } catch(err) {
        switch(err.name){
            case 'AbortError':
                /* Operation was aborted*/
                break;
            case 'DataError':
                /*issue with manifest file or id*/
                break;
        }
    }
};
```

## Installability criteria & Web app manifest `id`
To install content using the Web Install API, the document (current or background) must have a manifest file. In an ideal scenario the manifest file has an `id` key/value defined, but in either case the processed web app manifest `id` will serve as the installed application's unique identifier. 

The importance of `id`s for installed content is to avoid cases where multiple *same* apps are installed with no way to update them. More details can be found in [this document](https://docs.google.com/document/d/19dad0LnqdvEhK-3GmSaffSGHYLeM0kHQ_v4ZRNBFgWM/edit#heading=h.koe6r7c5fhdg).

>**Note:** There is no other requirement regarding what can be installed with the API and this requirement does not interfere with other affordances that some UAs have to add any content to the system/OS. This is, the UA can still allow the end user to install any type of content from a menu or prompt that follows different requirements than this API.

## Privacy and Security Considerations

### Same-origin policy
* The content installed using the `navigator.install` **does not inherit or auto-grant permissions from the installation origin**. This API does not break the *same-origin security model* of the web. Every different domain has its own set of independent permissions bound to their specific origin.

> **Note:** any application installed with the `install` method will have to ask for permissions (if any) when the user opens and interacts with the application.

### Preventing installation prompt spamming from third parties

* This API can only be invoked in a top-level navigable and be invoked from a [secure context](https://w3c.github.io/webappsec-secure-contexts/).

* The biggest risk for the API is installation spamming. To minimize this behaviour, installing a PWA using the Web Install API requires a [user activation](https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event).

* A new permission type will be introduced for an origin, that would allow it to install web apps. The first time a website requests to install (use the API) an app that is in another domain the UA will prompt the user to confirm that the website can install apps into the device. This prompt is similar to that of other permissions like geolocation or camera/microphone. The UA can decide how to implement this prompt.

A website that wants to install apps will require this new permission and will only be able to prompt the user for this in a period of time defined by the implementer. This will avoid spam from websites constantly asking for a permission to install apps, and will force websites to only prompt when there is a meaningful user intent to install apps.

The installation permission for an origin should be time-limited and expire after a period of time defined by the UA. After the permission expires the UA will prompt again for permission from the user.

###  New "installation" Permission for origin
A new "installation" permission is required if the content that is installing is not the current document. This permission is associated to the origin.

This results in a new integration with the [Permissions API](https://www.w3.org/TR/permissions/). The install API will make available the "installation" [PermissionDescriptor](https://www.w3.org/TR/permissions/#dom-permissiondescriptor) as a new [*powerful feature*](https://www.w3.org/TR/permissions/#dfn-specifies-a-powerful-feature). This would make it possible to know programmatically if `install` would be blocked.

```javascript
/* example of querying for the state of an installation permission using the Permission API  */

const { state } = await navigator.permissions.query({
  name: "installation"
});
switch (state) {
  case "granted":
    navigator.install('https://productivitysuite.com');
    break;
  case "prompt":
    //shows the install button in the web UI
    showInstallButton();
    break;
  case "denied":
    redirectToApp();
    break;
}
```

> **Note:** A permission prompt will appear for origins that do not have the capability to install apps if the invoking document is not the current one. Even if the installation is of a "[background document](#background-document-1-param)" in the same origin, for consistency the origin must have the permission to install apps. The only cases that will not prompt for the permission are the installation of the "[current document](#current-document)" or a "[background document](#background-document-1-param)" in an origin that already has installation permissions.

**Example:**

The app located in `https://productivitysuite.com` displays in its homepage 3 buttons that aim to install 3 different apps (notice all apps are in the same origin):
* the text processor located at `https://productivitysuite.com/text`
* the presentation app located at `https://productivitysuite.com/slides`
* the spreadsheet locacated at `https://productivitysuite.com/spreadsheet`

The end user goes to the homepage in the `https://productivitysuite.com`'s origin and clicks on the button to install the presentation application. As this is a *background document* (not the current document the user is interacting with) and the origin does not have permission to install apps, a permission prompt will appear. If this permission is granted for the origin, it can now install apps. After this permissin prompt the second prompt where the user confirms the isntallation appears.  

The end user then tries to install the text processor, and since the origin has been granted the permission, then it will prompt to confirm that "productivity suite wants to install text procesor". The installation permission is bound to an origin.

If the user where to deny the permission to install for the origin, they could browse to the app itself and once there, they can install the application. In this case there isn't any permission prompt required as this is now a *current document* installation. 


### Rejecting promise with `AbortError` and `DataError`

To protect the users privacy, the API does not create any new error names for the `DOMException`, instead it uses 2 common existing names: `AbortError` and `DataError`. This makes it harder for the developer to know if an installation failed because of a mismatch in id values, a wrong manifest file URL or if there is no id defined in the manifest.


### **Gating capability behind installation**
A UA may choose to gate the `navigator.install` capability behind a requirement that the installation origin itself is installed. This would serve as an additional trust signal from the user towards enabling the functionality.

**The user gesture, the new origin permission, the final installation confirmation (current default behaviour in the browser before installing an app) and the optional gated capability work together to minimize the risk of origins spamming the user for unrequested installations**, give developers flexibility to control the distribution of their apps and end users the facility to discover and acquire content in a frictionless way.

## Considered Alternative Solutions

### Declarative install

An alternate solution to allow installation of web apps is by allowing a new target type of `_install` to the HTML anchor tag.

`<a href="https://airhorner.com" target="_install">honk</a>`

Pros:
* Platform fallback to navigate to the content automatically.
* Does not need JavaScript.

Cons: 
* Takes the user out of the current context.
* Limits the amount of information a developer can act upon that the promise provides, such as if the prompt was shown or if the origin has permissions to install apps.
* Can become cumbersome when specifying the parameters in the tag.
* Can't easily pass additional information like the referral-info. 

The declarative solution is a simple and effective solution and future entry point for the API. It should be considered for a v2 of the capability. For the current solution, we've decided to go with an imperative implementation since it allows more control over the overall installation UX.

### `install_sources` manifest field

The `install_sources` was a new manifest field that specified which domains could install the application. This concept was removed after the TPAC 2024 breakout sessions over concerns that it might centralise control in favor of big app repositories. This is also based on a previous notion of same/cross origin installations, which has been updated to current/background documents and does not represent a 1:1 analogy, making this concept unsuited for the new shape of the API.

## Open Questions

* Is it correct to limit the permission when calling the `install` method if the background document is a cross-origin document?

* Should we allow an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to enable cancelling the installation if the process takes too long?

* Can we remove power from the developer to query if the app is installed by offloading to the UA the knowledge of which apps are installed?
    * Is there any form of attribute that can be added to a DOM element to signal this distinction/difference?

* Should `getInstalledApps` and `getInstalledRelatedApps` be merged together?
    See [this issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/804).

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