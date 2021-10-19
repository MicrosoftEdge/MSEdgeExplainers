# Forward Declared Storage Access API Explainer

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Privacy Community Group](https://privacycg.github.io/)
* Current version: this document. See also: [The Storage Access API](https://github.com/privacycg/storage-access/) in discussion at the [Privacy Community Group](https://privacycg.github.io/).

## Motivation
The [Storage Access API](../main/StorageAccessAPI/explainer.md) is a JavaScript API that allows fine-grained control of storage access permissions when access would otherwise be denied by the browser's current settings.  For federated authentication, it is desirable for a website to be able to continually communicate with its identity provider in order to fetch new tokens and revalidate that the user remains signed in. However, the ergonomics of the Storage Access API do not match the typical patterns of an authentication.  The Forward Declared Storage Access API attempts to match the permission model of the Storage Access API with a calling pattern more inline with authentication flows, without exposing the user to potential abuse by a site. 

## Goals
- To provide an interoperable, standardized, mechanism for a site to request access to storage resources while in the context of another site, that would otherwise be blocked by the browser.
- Exposing the JavaScript API to web sites, even if it always allows or rejects access (based on current behavior) will help sites to begin adopting the API and will allow other Chromium-based browsers to plug in their own set of policies.

## Non-goals
- Define policies for when the browser decides to allow storage access to a site. Different vendors may choose different defaults. That said, we would recommend exploring options to reduce cognitive load and annoyance for users by doing things such as:
    - Considering prior user decisions for access requests.
    - Disallowing repeated access prompts.
    - Auto-approving access (without a prompt) if the browser has sufficient signals about a positive relationship, such as a high site-engagement score.
- Change Chromium's default behavior.

## Existing Implementations & Discussions
Current implementations of Storage Access API: Firefox, Safari

MDN: https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API

Privacy CG discussions:
- https://github.com/privacycg/storage-access/issues/83

## Usage
If a website will redirect to an identity provider, with the knowledge that is will later load that identity provider as third-party content that requires access to its first-party storage, the Forward Declared Storage Access API provides a mechanism for the identity provider to request that access while it is accessed in a first-party context. Both the website and the IDP must call an API to unblock this scenario. 

API usage:
```js
partial interface Document {
    Promise<bool> allowStorageAccessOnSite(Url);
    bool hasStorageAccessForSite(Url);
    void requestStorageAccessForSite(Url);
};
```

#### document.allowStorageAccessOnSite(Url)
```js
document.allowStorageAccessOnSite("login.example.com");
window.location.href = "https://login.example.com?client_id=123&redirect_uri=https://site.example2.com/callback...";
);
```

#### document.requestStorageAccessForSite(Url)
```js
var params = new URLSearchParams(window.location.search);
var redirectUri = new URL(params.get("redirect_uri"));

if(document.hasStorageAccessForSite(redirectUri.origin)){
    return; // No need to prompt.
}

document.requestStorageAccessForSite(redirectUri.origin);
window.location.href = redirectUri + authenticationParameters; 

```

This pattern allows standard authentication flows to request neccesary access while hosted in a website, in a way that allows the identity provider to explain to the user why the prompt is neccesary. 

## Scope of Access
The API would address storage access for all forms of storage that may currently be blocked by existing policies and browser settings such as third-party cookies. This includes traditional HTTP cookies as well as other storage apis such as indexedDB and localStorage.  No changes to the scope or length of the permission grant would be made compared to the original Storage Access API.  

## Example
**Third-party cookie settings are set to block.**

A root document, https://example.site, embeds an iframe from https://federatedid.site that requires access to cookies to continue authenticating the user.
- Any requests for storage access from the federatedid.site frame will be blocked (no change)
- example.site will redirect the user to federatedid.site in order to sign in. 
- Immediately prior to the redirect, example.site will indicate that it expects federatedid.site to request Storage Access, by calling document.allowStorageAccessOnSite("federatedid.site")
- After the user authenticates at federatedid.site, federatedid.site will request Storage Access for later, when it is embedded within example.site, by calling document.requestStorageAccessForSite("example.site")
- The user will observe the prompt, and either accept or reject the prompt.  No promise is provided to federatedid.site to detect how the user has answered. 
- If federatedid.site does not immediately redirect to example.site, after showing the prompt, the permission will not be granted between the two sites. 
- If the browser or tab is closed between example.site redirecting to federatedid.site, or the user accepting the prompt and federatedid.site redirecting back to example.site, the permission is not granted between the two sites. 
- 

## Implementation Considerations

The permission from the parent frame to the to-be-embedded frame to request storage access is a short-lived permission it should last as long as the user's browser session, preferably being erased if the site does not immediately (for some minutes-long value of immediately) redirect to the permitted site. 

For cases where potentially one of many sites may request storage access, indicated by the parent site calling allowStorageAccessOnSite multiple times, all of these permitted sites must belong to the same First Party Set. 

For the purpose of "same-tab browsing session", a pop-up opened by the site is considered part of the same-tab browsing session. 

It is desirable to allow websites to permit this access while redirecting via an HTTP 302.  For this purpose, a header shall be introduced that provides the same effect - sec-allowStorageAccessRequest, permitted only on HTTP 302 redirects. The site being ultimately redirected to (e.g. in the case of 302 redirects from example.site to LegacyFederated.site to federatedid.site) shall be allowed to request storage access for the originating site as if it had called document.allowStorageAccessOnSite(). 

**The following remain open issues:**

- Should the requesting site ever learn the result of the prompt? Discussed in this [Privacy CG issue](https://github.com/privacycg/storage-access/issues/60) in part. 
- Is it desirable for a site to indicate that potentially one of many sites could request storage access within it as a result of a redirect? This may be a niche use case that presents attack concerns, with or without the First Party Set limitation. 

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Forward%20Declared%20Storage%20Access%20API) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BForward%20Declared%20Storage%20Access%20API%5D)
