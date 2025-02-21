# Search Providers --- Reset default search provider to brand's recommended default search provider.

## Authors:

- [Wei Gu](mailto:guw@microsoft.com)

## Status of this Document

This document is a starting point for engaging the community and standards
bodies in developing collaborative solutions fit for the Web. As the solutions
to problems described in this document progress along the standards-track, we
will retain this document as an archive and use this section to keep the
community up-to-date with the most current standards venue and content location
of future work and discussions.

* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* **Current version: this document**

## Introduction

Browsers have a list of search providers and each browser brand implementation has a recommended default search provider. This proposal aims to standardize the API that could be leveraged by webpages to detect whether current default search provider is the brand recommended default search provider and reset the current default search provider to brand's recommended one.

## Goals

The goals of the API are:

- Provide an API to detect whether current default search provider is brand's recommended default search provider.
- Provide an API to reset current default search provider to brand's recommended default search provider.

## Non-Goals

The API is not intended to be used for:

- Add new search provider.
- Update a search provider.
- Delete a search provider.

## Use Cases

The feature is intended to be used by any web page that wants to restore the current default search provider to brand's recommended default search provider. Here is scenario in which this can be useful to users:

- User opens a web page.
- JavaScript calls the API to detect whether current default search provider is brand's recommended default search provider.
- Page popups UI for user to reset the current default search provider to brand's recommended default search provider.
>>![scenario](scenario.gif)

## Proposed Solution

### Detect whether current default search provider is brand's recommended.

```js
chrome.searchProviders.isRecommendedDSE((success: boolean) => void);
```
> #### NOTE
> This API will run callback with **true** if the current default search provider is already the brand's recommended one **or** the current default search provider is managed policy, otherwise run callback with **false**.\
> See example of how current default search provider is managed by policy: [Default search provider policies](https://learn.microsoft.com/en-us/DeployEdge/microsoft-edge-policies#default-search-provider-policies). 

### Reset current default search provider to brand's recommended.

```js
chrome.searchProviders.resetToRecommendedDSE((success: boolean) => void)
```
> #### NOTE
> This API will run callback with **true** if it could successfully reset current default search provider to the brand's recommended one, otherwise run callback with **false**. This API will not reset  current default search provider if the current default search provider is managed by policy or current default search provider is brand's recommended one.\
> See example of how current default search provider is managed by policy: [Default search provider policies](https://learn.microsoft.com/en-us/DeployEdge/microsoft-edge-policies#default-search-provider-policies). 

## Security and Privacy Considerations

Please refer [security-privacy](./security-privacy.md)
