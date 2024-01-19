# **Web Install API** (*Cross-Origin*)

Authors: [Diego Gonzalez](https://github.com/diekus)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* **Current version: this document**

##  Introduction

Current paradigms of application discovery involve a user going to an application repository to search and install apps. These repositories are generally curated and have a level of trust associated by the user. They play a vital role in allowing a user to acquire high quality apps. Application repositories are valuable because they help developers acquire users, which incentivises developers to create better apps on the web platform.

While this is the general acquisition flow on many platforms, the web does not have the ability to replicate this scenario because it can not install applications. This makes it impossible for a web app (repository, catalog, store) to install and distribute other applications.

**The Web Install API** addresses this shortcoming in the platform. It **allows a web site to install a web app *([same](./explainer_same_domain.md) or **cross** origin)*. This functionality allows the creation of web based catalogs that can install PWAs directly from the web and into multiple platforms.**

## Goals

* **Enable installation of web apps (cross-origin).**
* Allow a ***vetted* installation origin** to know if the web app is installed (see *[`install_sources`](#install-sources-manifest-field) new manifest field*).
* Allow the web app to report to the installation origin the outcome of the installation.
* Enable UAs to [supress potential installation-prompt spam](#avoiding-installation-prompt-spamming).
* Track campaign IDs for marketing campaigns (with the [Acquisition Info API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AcquisitionInfo/explainer.md)).

## Non-goals

* Install same-origin content (see [Web Install - same-origin explainer](./explainer_same_domain.md)).
* Install arbitrary web content that is not an app (target must have a manifest file with [`install_sources`](#install-sources-manifest-field)).
* Change the way the UA currently prompts for installation of a web app.
* Associate ratings and reviews with the installed app ([see Ratings and Reviews API explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/RatingsAndReviewsPrompt/explainer.md)).
* Process payments for installation of PWAs ([see Payment Request API](https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API)).
* List purchased/installed goods from a store ([see Digital Goods API](https://github.com/WICG/digital-goods/blob/main/explainer.md)).
* Installing content that does not pass the installability criteria (see *[installability criteria](#installability-criteria)*).

## Use Cases

The Web Install API enables installation of cross-origin applications. A website will be able to include a button to install a related application, which can be hosted in another domain. The functionality can also be used to create online repositories of apps, improving discoverability of applications.

### **Creation of online catalogs**

 Although a website will be able to install a cross-origin application, the most typical use case for the API is related to the creation of online catalogs. A web site/app can list and install web apps. For example, `store.com` would be able to distribute apps on multiple platforms and multiple devices.

```javascript
/* tries to install a cross-origin web app */

const installApp = async (manifest_id) => {
    if ('install' in navigator === false) return; // api not supported
    try {
            await navigator.install(manifest_id);
    } catch(err) {
        switch(err.message){
            case 'AbortError':
                /* Operation was aborted*/
                break;
           
        }
    }
};
```

  ![Install flow from an app repository](./apprepositoryinstallation.png) 

## Proposed Solution

### The `navigator.install` method

To install a web app, a web site would use the promise-based method `navigator.install(<manifest_id>[, <install_url>[, <params>]]);`. This method will:

* Resolve when an installation was completed.
    * The success value will be an object that contains:
     	*  `manifest_id`: string with the computed `manifest_id` of the installed app.
* Be rejected if the prompt is not shown or if the app installation did not complete. It'll reject with a [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) value of:
    * `AbortError`: The installation (prompt) was closed/cancelled.


![Promises resolve/reject flow](./installPromises.png) 

#### **Signatures of the `install` method (cross-origin)**
The cross-origin part of the Web Install API consists of the extension to the navigator interface with an `install` method. This method receives:
* `manifest_id`: declares the specific application to be installed. This is the unique id of the application that will be installed. This value must match the id specified in the manifest file. 
* `install_url`: a url meant for installing an app. This url can be any url in scope of the manifest file that links to it. An `install_url` must not redirect nor contain extra content that is not relevant for installation purposes. In the absence of an `install_url`, the value defaults to that of the `manifest_id`.
* optional [parameters](#parameters).

If the `manifest_id` is the *what* to install, the `install_url` is the *where* to find it.

Unless the UA decides to [gate this functionality behind installation](#gating-capability-behind-installation), the behaviour between calling the `install` method on a tab or on an installed application should not differ. The install method can be used in two different ways.

1. `navigator.install(<manifest_id>, <install_url> [, <params>])`: This signature of the method requires the id of the application to be installed (`manifest_id`), and the installation location for the app (`install_url`). This is the most common API use case the API for cross-origin scenarios.

2. `navigator.install(<manifest_id> [, <params>])`: The method receives a parameter which is a [manifest id](https://w3c.github.io/manifest/#id-member) to a web app to install. There is no explicit `install_url`, which means it is the same value as the `manifest_id`. This is a shorthand to calling `navigator.install(<manifest_id>, <manifest_id>)`.

In both cases, this will prompt for installation of the app if the requesting origin has installation permissions (see [security section](#integration-with-the-permissions-api)) and the target application has specified this domain in its `install_sources` manifest field.

#### **Parameters**

The `navigator.install` call can receive an object with a set of parameters that specify different installation behaviours for the app. It is also a way to future-proof the API if additional data were required with the call.
* **referral-info**: this parameter takes the form of an object that can have arbitrary information required by the calling installation domain. This information can later be retrieved inside the installed application via the [Acquisition Info API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/AcquisitionInfo/explainer.md). 

#### **Installing the web app**

To install a same domain web site/app, the process is as follows:
1. Origin site that triggers the installation must have installation permissions as it tries to install a cross-origin app.
2. target site/app must comply with *[installability criteria](#installability-criteria), if any*.
3. If the target content is a web app with a manifest, check if the domain is in the list of [allowed origins](#install-sources-manifest-field) to install said content. If the target content is not a web app, it can't be installed.
3. Prompt the user for install confirmation. User is given a choice about whether to install the target content or not.
4. If the users accepts, the content is installed.
5. UA default action post-install (generally the app will open/be added to homescreen/start menu/dock). 
 
### The `navigator.getInstalledApps` method

If supported by the UA, the `getInstalledApps` method returns a list of the content that has been installed from *that* installation origin which is still installed on the device at the time of execution. This is an **async** method of the `navigator` interface that allows the installation origin to know which applications it has installed.

This works until cache is cleared. The installation origin *will not* be informed of any apps installed by other means, whether via another installation origin, directly through the browser, or by a native app store. The method returns a list of manifest ids of content installed from the calling origin.

Additionally, if the browser has an active 'Do Not Track (DNT)', equivalent 'Global Privacy Control (GPC)' setting, is in Private browsing mode, or is an opinionated browser towards privacy, this is ignored and installation origins will not be allowed to know if that application is installed. In this case the `navigator.getInstalledApps` will return a `null`.

* The approach for showing which apps have been installed from this origin follows the same API approach where the information is accessible if it matches a [partition key](https://github.com/kyraseevers/Partitioning-visited-links-history#general-api-approach), instead of just the link URL. This ensures installed apps can be seen only from the origin matching all parts of the key.

## Relation with other web APIs/features 

* **`navigator.install` and Permissions API:** see [integrations with the Permissions API](#integration-with-the-permissions-api).

* **`navigator.install` and manifest file's `prefer_related_applications`:** When the `related_applications` and `prefer_related_applications` key/values are present in the manifest, the UA should try to handoff the install to the prefered catalog. If this is not possible then it fallback to a default UA install.

* **`navigator.install` and `side-panel` display-mode:** Due to the evolving nature of web apps, there are different surfaces where these can be installed. If the target of `navigator.install` call has a manifest file with a `display_override` member that includes a [`side-panel` value](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/SidePanel/explainer.md), this can hint to the UA that the app can be installed as a sidebar app if supported.

## Installability criteria
In order for an application/site to be installed, it must comply with *installability criteria*. **This criteria is entirely up to the UA**, can *vary depending on the installation target*, and can be optional.

Modern browsers allow for different degrees of installation of different types of content, ranging from traditional web sites all the way up to Progressive Web Apps. **The core functionality of the API is that it allows to install *anything* initiated with a user action**.

A user agent might decide to have only the requirement of HTTPS to allow installation of a web site, or may need as well a manifest file and/or service worker to install a web app or might not require anything at all, allowing the user to install any content they wish.

For cross-origin content, the target content must have an [`install_sources`](#install-sources-manifest-field) field that allows the installation from the installation origin.

## Privacy and Security Considerations

### Same-origin policy
* The content installed using the `navigator.install` **does not inherit or auto-grant permissions from the installation origin**. This API does not break the *same-origin security model of the web. Every different domain has its own set of independent permissions bound to their specific origin.

### Preventing installation prompt spamming from third parties

* This API can only be invoked in a top-level navigable and be invoked from a [secure context](https://w3c.github.io/webappsec-secure-contexts/).

* The biggest risk for the API is installation spamming. To minimize this behaviour, installing a PWA using the Web Install API requires a [user activation](https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event).   

* A new permission type will be introduced for an origin, that would allow it to install web apps. The first time a website requests to install an app (use the API) the UA will prompt the user to confirm that the website can install other apps into the device. This prompt is similar to that of other permissions like geolocation or camera/microphone. The UA can decide how to implement this prompt.

A website that wants to install apps will require this new permission and will only be able to prompt the user for this in a period of time defined by the implementer. This will avoid spam from websites constantly asking for a permission to install apps, and will force websites to only prompt when there is a meaningful user intent to install apps.

The installation permission for an origin should be time-limited and expire after a period of time defined by the UA. After the permission expires the UA will prompt again for permission from the user.

####  **Integration with the Permissions API**
A new permission that can be associated with an origin means a new integration with the [Permissions API](https://www.w3.org/TR/permissions/). The install API will make available the "installation" [PermissionDescriptor](https://www.w3.org/TR/permissions/#dom-permissiondescriptor) as a new [*powerful feature*](https://www.w3.org/TR/permissions/#dfn-specifies-a-powerful-feature). This would make it possible to know programmatically if `install` would be blocked.

```javascript
/* example of querying for the state of an installation permission using the Permission API  */

const { state } = await navigator.permissions.query({
  name: "installation"
});
switch (state) {
  case "granted":
    navigator.install('https://elk.zone');
    break;
  case "prompt":
    //shows the install button in the web UI
    showInstallButton();
    break;
  case "denied":
    redirectToAppStore();
    break;
}
```
####  **Install Sources manifest field**
* A new field called `install_sources` will be added to the manifest file to have a control list of sites that can install the app. In its most restrictive case, the developer can specify to not allow installation from any other origin, in which case the PWA conforms to its usual behaviour of only being able to be installed from its same origin.

##### Allowing installations from any origin
A new web-manifest boolean key `allow_all_install_sources` signals that the application can be installed from any source. If set to `true`, the `install_sources` list is ignored (if included). If set to `false` or absent, it defers to the origins listed in `install_sources`.

```json
{
    "name": "Awesome PWA",
    "display": "standalone",
    "start_url": "/index.html",
    "install_sources": [ 
	    {"origin": "apps.microsoft.com"},
	    {"origin": "store.app"}
    ]
}
```

This new manifest field will protect the app from being listed in undesirable repositories and give the developer absolute control about where do they want the PWA to be installed from. At best, the developer can allow the PWA to be installed from any site ("`*`"), at its most restrictive, it can only allow installing from the app's same scope. This field is only for the JS API and does not interfere with existing ways of installing PWAs through mechanisms like enterprise policies.

If no `install_sources` are present in the manifest file, the default should be to not allow an app to be installed from cross-origin sites.

#### **Gating capability behind installation**
A UA may choose to gate the `navigator.install` capability behind a requirement that the installation origin itself is installed. This would serve as an additional trust signal from the user towards enabling the functionality.

**For cross-origin installs, the user gesture, the new origin permission, the new manifest field the final installation confirmation (current default behaviour in the browser before installing an app) and the optional gated capability work together to minimize the risk of origins spamming the user for unrequested installations**, give developers complete flexibility about where their apps will be installed from and provide the user with an implicit (double: one for the user gesture, the other one from the prompt before installing) confirmation before the app gets installed on their device.

## Alternative Solutions

* **HTML anchor tag target install
`<a href="https://airhorner.com" target="_install">honk</a>`:** An alternate solution to allow installation of web apps is by allowing a new target type of `_install` to the HTML anchor tag. This has the benefit of being able to work in environments that have JS disabled and can also be another entry point for installation. While this is an elegant solution, it limits the amount of information a developer can act upon that the promise does provide, such as if the prompt was shown or if the origin has permissions to install apps.

## Open Questions

* Should we allow an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to enable cancelling the installation if the process takes too long?

* Can we remove power from the developer to query if the app is installed by offloading to the UA the knowledge of which apps are installed?
    * Is there any form of attribute that can be added to a DOM element to signal this distinction/difference?

## Glossary
* **installation origin**: the origin that initiates the call to the `install` method.
* **UA**: user agent.
## Acknowledgements

This explainer takes on the work [previously published by PEConn](https://github.com/PEConn/web-install-explainer/blob/main/explainer.md).

Special thanks to Amanda Baker, Patrick Brosset, Alex Russell, Howard Wolosky, Lu Huang, Jonathan Kingston and the [PWA Builder](https://www.pwabuilder.com) team for their input.