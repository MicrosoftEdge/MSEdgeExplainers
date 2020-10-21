# Adding Response Metadata to Cache API Explainer

Authors: [Aaron Gustafson](https://github.com/aarongustafson), [Jungkee Song](https://github.com/jungkees)

## Status of this Document
This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/) 
* Current version: this document

## Introduction

Currently, many sites are using Service Workers and the Cache API to store absolutely everything they can, often relying on the browser to evict content when there is storage pressure. Sites that want to be more proactive in managing their caches are limited to pruning responses solely based on when they were cached, typically iterating over the keys of a given cache and deleting the first item until they reduce the quantity of cached responses below a predefined threshold. That might be a good strategy if all responses were equal, but they aren’t. Some payloads are large, others are small. Some resources are computationally-intensive to produce, others are static files served by a CDN. Some are only accessed once, others are accessed with great frequency, often depending on both the site itself and the particular user interacting with it.

Having a little more clarity on the shape and form of cached responses would enable developers to be more intentional about what they do with cached content.

## Caching response metadata

It would be quite useful to have access to metadata about each cached item. Much of the useful metadata is managed by the user agent, for example:

- Timestamp for when the `Response` was added to the cache
- Timestamp for the last time the `Response` was retrieved from the cache
- How many times a given `Response` has been retrieved from the cache
- The amount of space the cached `Response` occupies on disk

It’s worth noting that the size on disk could be inferred from the `Response`’s "Content-Length" header (or "Transfer-Encoding"), but these methods are unreliable. A better approach is to have the browser actually fill in this data so it is available even if these headers are omitted.

Taken together, this Explainer proposes adding the following read-only attributes to the `Response` class, as [defined by the Fetch API](https://fetch.spec.whatwg.org/#response):

- `cachedAt`: timestamp added when the Response is cached
- `lastResponseAt`: timestamp updated [each time a cached Response is returned by the Service Worker](#observing-responses); must be at least as new as `cachedAt`
- `responseCount`: a number that increments [each time a cached Response is returned by the Service Worker](#observing-responses)
- `size`: computed disk size of the Request/Response object pair (or 0 for opaque `Response`s)

If adding these directly to the `Response` is not feasible, these could be added as properties of an object assigned to a single key, such as `Response.cacheData`. Ideally, however, these could be added to a subclass of the `Response` interface used in the `Cache API` context specifically:

```idl
interface CachedResponse : Response {
  readonly attribute DOMTimeStamp cachedAt;
  readonly attribute DOMTimeStamp lastResponseAt;
  readonly attribute unsigned long long responseCount;
  readonly attribute unsigned long long size;
};
```

These keys would only be available for all `CachedResponse`s with the exception of opaque `Request`s, which must always report a size of "0".

## Goal

Enable developers to access a richer set of information about their cached Requests in order to help them make better decisions with respect to purging content.

## Non-goals

Provide developers with more convenient access to other metadata that could be obtained by reading the `Response` headers (e.g., "Server-Timing").

## Use Cases

Websites that want to limit their own cache often purge items based on when they were cached (inferred by the order in which they are added to the cache, reflected in `cache.keys`):

```js
function trimCache(cacheName, maxItems) {
  // open the cache
  caches.open(cacheName)
    .then( cache => {
      // get the keys and count them
      cache.keys()
      .then(keys => {
        // Do we have more than we should?
        if (keys.length > maxItems) {
          // delete the oldest item and run trim again
          cache.delete(keys[0])
            .then( () => {
              trimCache(cacheName, maxItems)
            });
        }
      });
    });
}
```

This assumes all cached `Response`s are equal in terms of both usefulness to the end-user and how much disk space they are occupying. Being able to retrieve information such as when they were last accessed and how much space they occupy on disk could enable them to make smarter decisions around cache eviction.

## Examples

**Example 1:** Remove content that is very large (> 5 MB) and has not been accessed in more than 30 days:

```js
async function trimCache( cacheName ) {
  const large = 5000000; // 5 MB
  const old = Date.now() - 2592000000 // 30 days ago

  const cache = await caches.open( cacheName );
  
  // Collect Request objects
  for (const request of await cache.keys()) {
    cache
      .match(request)
      .then(response => {
        if ( response.size > large &&
             response.lastResponseAt < old )
        {
          cache.delete( request );
        }
      });
  }
}
```

**Example 2:** Remove content accessed fewer than 5 times, with the last time being more than 90 days ago:

```js
async function trimCache( cacheName ) {
  
  const old = Date.now() - 7776000000 // 90 days ago

  const cache = await caches.open( cacheName );  
  for (const request of await cache.keys()) {
    cache
      .match(request)
      .then(response => {
        if ( response.responseCount < 5 &&
             response.lastResponseAt < old  )
        {
          cache.delete( request );
        }
      });
  }
}
```

**Example 3:** Remove content that only got used when it was cached, over 180 days ago:

```js
async function trimCache( cacheName ) {
  
  const old = Date.now() - 15552000000 // 180 days ago

  const cache = await caches.open( cacheName );  
  for (const request of await cache.keys()) {
    cache
      .match(request)
      .then(response => {
        let cached_at = new Date( response.cachedAt ),
            accessed_at = new Date( response.lastResponseAt );
        // If year, month, and day match + old
        if ( cached_at.getFullYear() === accessed_at.getFullYear() &&
             cached_at.getMonth() === accessed_at.getMonth() &&
             cached_at.getDate() === accessed_at.getDate() &&
             response.cachedAt < old )
        {
          cache.delete( request );
        }
      });
  }
}
```

## Observing Responses

This spec draws a distinction between accessing a cached resource and actually responding with that resource. The act of merely reading a cached resource via the Cache API would not update its `lastResponseAt` timestamp or increment its `responseCount`. For these values to be updated, the cached response would actually need to be sent to the browser using [`FetchEvent.respondWith()`](https://w3c.github.io/ServiceWorker/#dom-fetchevent-respondwith).

As an example of why this matters, consider [this scenario](https://remysharp.com/2019/09/05/offline-listings): an author builds functionality into their offline page that exposes all web pages that have been cached, so a user can see what content they have access to offline. As part of that JavaScript program, they read the contents of the cache looking for HTML pages and extract the contents of the `title` and `meta[name=description]` elements and then present that content (along with a link to the resource) in the `body` of the document. In this scenario, the resource has been used, but it was not provided as a response, so it would not trigger an update of `lastResponseAt` or `responseCount`. Following the link, however, results in the Service Worker responding to the `FetchEvent` with the cached response and that *would* trigger an update of `lastResponseAt` and `responseCount`.

## Implementation Notes

* Testing is required to confirm whether or not there are performance issues with respect to updating `lastResponseAt` and `responseCount` ([Issue #148](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/148))

## Privacy Considerations

It is possible that the timestamps stored in the `cachedAt` and `lastResponseAt` properties could be used for fingerprinting. As developers already have the ability to use `performance.now()` to get timestamps when resources are cached, this new functionality does not introduce any new fingerprinting risk.

It is possible that `responseCount` could be used for fingerprinting (leveraging the [User Behavior fingerprinting vector](https://2019.www.torproject.org/projects/torbrowser/design/#fingerprinting-linkability)), but the `responseCount` property does not introduce any fingerprinting surface not already exposed via the Cache API.

To eliminate the possibility that a first-party website could use this functionality to snoop on the content of a third-party request service, User Agents are required to report a `size` of 0 for all opaque `Response`s.

## Open Questions

1. Would it be worthwhile to introduce a mechanism by which developers specifically opt-out of updating details like `lastResponseAt` and/or `responseCount` when retrieving an item from the cache?
2. The `trimCache` examples could be run in the main thread or the ServiceWorker, but in either instance could potentially cause the script to lock up. Would it make sense to introduce an async iterator to the Cache API in order to reduce the need for repeatedly calling match? Could there be an async iterator that efficiently enables cache pruning based on these keys?