# **Web Install API** (*Same-Domain*)

Authors: [Diego Gonzalez](https://github.com/diekus)

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Applications Working Group](https://www.w3.org/groups/wg/webapps/)
* **Current version: this document**

##  Introduction

Modern browsers have UX that enable users to *install* web content on their devices. This content ranges from web sites to Progressive Web Apps, and different UAs implement mechanisms and UI affordances that a user can trigger or the UA can signal for this installation to happen.

**The Web Install API** aims to standardize the way installations are invoked by developers, creating an ergonomic, simple and consistent way to get web content installed onto a device. It **allows a web site to install web content** (both from the **same** or [cross](./explainer_cross_domain.md) domain). This capability can be used by a site to install itself when the [installability criteria](#installability-criteria) is met.

## Goals

* **Enable installation of web apps (same-domain).**
* Replace `beforeinstallprompt` or associated behaviour (current way to install apps from the same-domain).
* Allow the web app to report to the installation origin the outcome of the installation.
* Enable UAs to supress potential installation-prompt spam.
* Track campaign IDs for marketing campaigns.

## Non-goals

* Install cross-domain content (see [Web Install - cross-domain explainer](./explainer_cross_domain.md)).
* Change the way the UA currently prompts for installation of a web app.
* Associate ratings and reviews with the installed app ([see Ratings and Reviews API explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/RatingsAndReviewsPrompt/explainer.md)).
* Process payments for installation of PWAs ([see Payment Request API](https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API)).
* List purchased/installed goods from a store ([see Digital Goods API](https://github.com/WICG/digital-goods/blob/main/explainer.md)).
* Installing content that does not pass the installability criteria (see *[installability criteria](#installability-criteria)*).
* Enumerate if the app/related apps are installed ([see getInstalledRelatedApps](https://github.com/WICG/get-installed-related-apps/blob/main/EXPLAINER.md)).

## Use Cases

### **Installing a web app from the current origin**
The site can trigger its own installation. The current way of doing this is with the `onbeforeinstallprompt`, and this would be phased out in favor of a unified `install` method for same *and* cross domains.

```javascript
/* tries to install the current domain */
const installApp = async () => {
    try{
        if ('install' in navigator) {
            const appInstalled = await navigator.install();
        }
    }
    catch(err) {
        switch(err.message){
            case 'NotAllowedError':
                /* No installation origin permissions */
                break;
            case 'NotSupportedError':
                /* The web site does not comply with installability criteria */
                break;
        }
    }
};

```

![Same domain install flow](./samedomaininstall.png) 

The **`navigator.install()` method will replace `onbeforeinstallprompt` for same domain installation**. When the method is called it will trigger the UA to prompt for the installation of an application. This is analogous to when the end user clicks on an affordance that the UA might have to inform the user of installing. On Edge, Chrome (desktop) and Samsung Internet (mobile), this would be then the user clicks on the 'app available' banner or related UX that appears on the omnibox of the browser. For browsers that do not implement prompting, the expected behaviour is analogous to their installation paradigm. For example, in Safari (desktop) the behaviour might be that the content gets added to the dock as an app.

The threshold for `navigator.install()` to resolve on same-domain installations uses the same checks that `onbeforeinstallprompt` currently has for prompting (if required by the UA). The promise doesn't resolve unless the *installability criteria* is met.

When called on the same domain, the **`install()` method will trigger/open the prompt for installation the same way that using `onbeforeinstallprompt` does right now for browser that prompts.** If the domain is not installable content, then the promise returns a `DOMException` of type 'NotSupportedError'.


## Proposed Solution

### The `navigator.install` method

To install a web site/app, the site/app would use the promise-based method `navigator.install([<params>]);`. This method will:

* Resolve when an installation was completed.
    * The success value will be an object that contains:
     	*  `mode`: string with the surface-hint where the app was installed.
* Be rejected if the prompt is not shown or if the app installation did not complete. It'll reject with a [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) value of:
    * `NotAllowedError`: The (new) `installation` [Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Permissions_Policy) has blocked the use of this feature.
    * `NotSupportedError`: the target does not comply with the [installability criteria](#installability-criteria).
    * `InsufficientEngagementError`: the UA's required (if any) [engagement heuristics](https://web.dev/install-criteria/#criteria) have not been met.
    * `AbortError`: The installation (prompt) was closed/cancelled.
    * `TimeoutError`: The installation failed due to timeout.
    * `OperationError`: other error.
	
    
 ```javascript
/* simple example of using navigator.install */

const installApp = async () => {
    try{
        const value = await navigator.install();
    }
    catch(err){console.error(err.message)}
};

```

```javascript
/* Example of advanced error handling */

(...)
.catch(error => {
    if(error.name === 'NotSupportedError') {
        // target site is not installable
        console.log("Target is not an installable content.");
    }
    else if (error.name === 'NotAllowedError') {
        // origin cannot install other webapps.
        console.log("Origin does not have permissions to install web apps.");
    }
    else {
        console.log(error.message);
    }
});
```

![Promises resolve/reject flow](./installPromises.png) 

#### **Signatures of the `install` method (same-domain)**
The same-domain part of the  Web Install API consists of the extension to the navigator interface with the install method. The install method can be used in several different ways. There is no difference in behaviour when this is called from a standalone window or a tab.

1. `navigator.install()`: The method receives no parameters and tries to install the current domain as an app. This would replace `beforeinstallprompt` and the current way developers have been controlling the prompt to install apps.

2. `navigator.install(<params>)`: The method receives an object with parameters that it can use to customize a same domain installation. These parameters alter how the app is installed and are defined in an object. More information about the parameters is found in the [Parameters](#parameters) subsection of this specification.

#### **Parameters**

The `navigator.install` call can receive an object with a set of parameters that specify different installation behaviours for the app.

* **referral-info**: this parameter takes the form of an object that can have arbitrary information required by the calling installation domain. 

#### **Installing the web app**

To install a same domain web site/app, the process is as follows:
1. Site/app must comply with *[installability criteria](#installability-criteria)*.
2. Prompt the user for install confirmation.
3. Install the app.
4. UA default action post-install (generally the app will open/be added to homescreen/start menu/dock). 
   
## Relation with other web APIs 

* **`navigator.install` and manifest file's `prefer_related_applications`:** When the `related_applications` and `prefer_related_applications` key/values are present in the manifest, the UA should try to handoff the install to the prefered catalog. If this is not possible then it fallback to a default UA install.

* **`navigator.install()` and getInstalledRelatedApps():** If a web app tries to install itself (same domain install) it can first use the `getInstalledRelatedApps()` to check if it is already install and hide the installation UI.

```javascript

const relatedApps = await navigator.getInstalledRelatedApps();
relatedApps.forEach((app) => {
    if(app.platform === 'webapp') {
        /* hides install button that calls `navigator.install method` */
    }
});

```

## Installability criteria
In order for an application/site to be installed, it must comply with *installability criteria*. **This criteria is entirely up to the UA** and can *vary depending on the installation target*. 

Modern browsers allow for different degrees of installation of different types of content, ranging from traditional web sites all the way up to Progressive Web Apps. **The core functionality of the API is that it allows to install *anything* initiated with a user action**.  

 As an example, generally this criteria involves one or several of the following requirements:
* served under an *HTTPS connection*
* have a *web app manifest file* and certain fields like icons and name
* have a *service worker*

Thus, a user agent might decide to have only the requirement of HTTPS to allow installation of a web site, or may need as well a manifest file and/or service worker to install a web app.

## Privacy and Security Considerations

### Avoiding Installation prompt spamming

* This API can only be invoked in a top-level [secure context](https://w3c.github.io/webappsec-secure-contexts/).

* The biggest risk for the API is installation spamming. To minimize this behaviour, installing a PWA using the Web Install API requires a [user gesture](https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event).  

**For same-domain installs, the user gesture and the final installation confirmation (current default behaviour in the browser before installing an app) work together to minimize the risk of origins spamming the user for unrequested installations**. 

## Alternative Solutions

* **HTML anchor tag target install
`<a href="https://airhorner.com" target="_install">honk</a>`:** An alternate solution to allow installation of web apps is by allowing a new target type of `_install` to the HTML anchor tag. This has the benefit of being able to work in environments that have JS disabled and can also be another entry point for installation. While this is an elegant solution, it limits the amount of information a developer can act upon that the promise does provide, such as if the prompt was shown or if the origin has permissions to install apps.

## Open Questions

* Should we enable a [try-before-you-buy](https://github.com/PEConn/web-install-explainer/blob/main/explainer.md#try-before-you-buy) flow scenario for web install?

* Should we allow an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to enable cancelling the installation if the process takes too long?

## Glossary
* **installation origin**: the origin that initiates the call to the `install` method.
* **installed origin**: the origin that is installed with the `install` method.

## Acknowledgements

This explainer takes on the work [previously published by PEConn](https://github.com/PEConn/web-install-explainer/blob/main/explainer.md).

Special thanks to Amanda Baker, Patrick Brosset, Alex Russell, Howard Wolosky, Lu Huang and the [PWA Builder](https://www.pwabuilder.com) team for their input.
