# Storage Access API Explainer

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Archived**
* Expected venue: [W3C Privacy Community Group](https://privacycg.github.io/)
* Current version: this document. See also: [The Storage Access API](https://github.com/privacycg/storage-access/) in discussion at the [Privacy Community Group](https://privacycg.github.io/).

## Motivation
As privacy is becoming increasingly important to users, requests for stricter browser defaults and user opt-in settings like blocking all third-party storage access are increasingly common. While these settings help improve privacy and block unwanted access by unknown or untrusted parties, they can have unwanted side effects such as blocking access to content the user may want to view (e.g. social media and embedded media content).

Users shouldn't have to compromise between privacy protections and enabling sites' embedded content to function correctly. The Storage Access API is a JavaScript API that allows fine-grained control of storage access permissions when access would otherwise be denied by the browser's current settings. Sites with meaningful scenarios that depend on loading third-party resources will be able to leverage the API to allow the user to explicitly choose, on an as-needed basis, when to allow more permissive access.

## Goals
- To provide an interoperable, standardized, mechanism for web content to request access to storage resources that would otherwise be blocked by the browser.
- To not constrain the UX of implementors and to allow other Chromium-based browsers to plug in their own set of policies for when to allow/deny access, or prompt.
    - For instance, we suggest the Chrome team consider adding a permission prompt for users who have disabled third-party cookies and would be open to providing an implementation if so desired.
- Exposing the JavaScript API to web sites, even if it always allows or rejects access (based on current behavior) will help sites to begin adopting the API and will allow other Chromium-based browsers to plug in their own set of policies.

## Non-goals
- Define policies for when the browser decides to allow storage access to a site. Different vendors may choose different defaults. That said, we would recommend exploring options to reduce cognitive load and annoyance for users by doing things such as:
    - Considering prior user decisions for access requests.
    - Disallowing repeated access prompts.
    - Auto-approving access (without a prompt) if the browser has sufficient signals about a positive relationship, such as a high site-engagement score.
- Change Chromium's default behavior.

## Existing Implementations & Discussions
Current implementations: Firefox, Safari

MDN: https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API

WHATWG discussions:
- https://github.com/whatwg/html/issues/3338
- https://github.com/whatwg/dom/issues/560

Safari overview: https://webkit.org/blog/8124/introducing-storage-access-api/

## Usage
If a website loads third-party content that requires access to its first-party storage, and the current browser settings would block that access, the Storage Access API provides a mechanism for the third-party content to request access. A document can call one of two new APIs to check for access or request access respectively.

API usage (https://webkit.org/blog/8124/introducing-storage-access-api/):
```js
partial interface Document {
    Promise<bool> hasStorageAccess();
    Promise<void> requestStorageAccess();
};
```

#### document.hasStorageAccess()
```js
var promise = document.hasStorageAccess();
promise.then(
  function (hasAccess) {
    // Boolean hasAccess says whether the document has access or not.
  },
  function (reason) {
    // Promise was rejected for some reason.
  }
);
```

#### document.requestStorageAccess()
```html
<script>
function makeRequestWithUserGesture() {
  var promise = document.requestStorageAccess();
  promise.then(
    function () {
      // Storage access was granted.
    },
    function () {
      // Storage access was denied.
    }
  );
}
</script>
<button onclick="makeRequestWithUserGesture()">Play video</button>
```

This greater level of control over storage access permissions allows for existing Chromium privacy controls such as third-party cookie blocking to be hooked up to this API in order to allow for broader adoption of more privacy-centric settings while also providing potentially broken scenarios-- such as federated authentication and user-desired third-party content-- a mechanism to restore functionality in a highly-targeted manner. This API also provides a valuable abstraction at the platform layer for other Chromium implementors to integrate additional privacy controls while providing a unified mechanism to control storage access permissions.

## Scope of Access
The API would address storage access for all forms of storage that may currently be blocked by existing policies and browser settings such as third-party cookies. This includes traditional HTTP cookies as well as other storage apis such as indexedDB and localStorage.

## Example
**Third-party cookie settings are set to block.**

A root document, https://example.site, embeds an iframe from https://socialmedia.site that requires access to storage to authenticate.
- Any requests for storage access from the socialmedia.site frame will be blocked (no change)
- The content from socialmedia.site can use the Storage Access API to request access to storage while loaded on example.site.
- The first time a user interacts with content from socialmedia.site and document.requestStorageAccess() is called, a decision is made by the browser to allow or reject access. This can be done using existing information such as previous/current site-engagement with socialmedia.site, an optional prompt, or other browser implemented logic.
    - Subsequent requests to storage will be allowed if the call to document.requestStorageAccess() was successful.
    - Subsequent calls to Storage Access API methods will auto resolve/reject based on the previous decision.
- Subsequent loads of socialmedia.site on example.site, within a set timeframe after a successful document.requestStorageAccess() call (e.g. 30 days), will result in immediately granting storage access.
    - This allows content to seamlessly work for a reasonable period of time after explicit interaction and consent has been obtained, allowing it to function in subsequent loads without re-prompting the user.

## Implementation Considerations
There are two existing similar implementations with minor differences (Firefox, and Safari), documented at https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API#Safari_implementation_differences.
The intent is to follow common implementation patterns between the two implementations. Where differences exist or more favorable Chromium mechanisms exist (e.g. site-engagement scores) a preference towards being minimally invasive for the user (e.g. few, or no prompts) and maintaining functional web experiences will be taken. There are a number of considerations discussed by various Chromium implementors and browser vendors in the WHATWG discussion (https://github.com/whatwg/html/issues/3338). The intent is to take these concerns, feedback, and considerations into account when making design decisions in areas that differ between implementations.

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Storage%20Access%20API) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BStorage%20Access%20API%5D)
