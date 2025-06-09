# Allow mapping of Performance Resource Timings to Fetch Events

Authors:
* [Monica Chintala](https://github.com/monica-ch) - Engineer at Microsoft Edge
* [Victor Huang](https://github.com/victorhuangwq) - Product Manager at Microsoft Edge

## Participate
[Would like a precise way to map PerformanceTimings to FetchEvent](https://github.com/w3c/resource-timing/issues/259)

## Introduction
[Resource Timing](https://www.w3.org/TR/resource-timing/) API has no information that uniquely identifies each resource timing to each fetch request. As such, in situations where resources are fetched multiple times, such as with multiple tabs or multiple requests to the same URL, it’s not possible to accurately map resource timings. This lack of clear mapping can hinder performance analysis and optimization efforts. 

This document proposes enhancements to Resource Timing API to enable developers to accurately map resource timings to specific fetch events. This addresses challenges in mapping resource timings in navigation scenarios involving service workers, multiple tabs, and navigation preloads.

This proposal is adjacent to the [Resource Timing Initiator Info explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/ResourceTimingInitiatorInfo/explainer.md), but it solves different problems. While the Initiator Info explainer focuses on providing additional context about what initiated a resource request, this proposal aims to establish a precise mapping between resource timings and fetch events.

## Goals
The proposed changes in this document aim to provide web developers with the ability to map resource timings to fetch events easily and accurately. 

## Non-Goals
* Introduce a new form of unique identifier for every fetch scenario. 
* Introduce any breaking changes that would affect existing implementations.
* XMLHttpRequest API is considered a legacy API and is no longer being enhanced and focus remains on fetch() and PerformanceResourceTiming, aligning with modern web development practices.  

## Use Cases
Tracking resource timing across multiple requests, whether from different browsing contexts (e.g. multiple tabs) or service workers, can be challenging. Some examples include:
1. **Measuring Resource Timing Across Client and Service Worker** <br>
   When multiple tabs request the same resource through a service worker, associating timing data between the Performance Resource Timing entries observed in the client and those within the service worker can be difficult. The client-side performance.getEntries() provide the total duration of the request, but it lacks insight into processes inside service worker, such as request handling and network retrieval. The service worker itself can collect performance timing for fetch requests, but there is no direct linkage between these entries and those in the client’s performance timeline.  

   This limitation is particularly problematic for navigation preload requests, where fetch stages occur both in the main thread and the service worker without a unified timing reference. While developers can annotate service worker fetch requests, navigation preload fetches cannot be similarly tagged. 

2. **Tracking Fetch Events to Resource Timing Entries** <br>
   When multiple requests target the same URL from a single client or across multiple tabs (e.g. user opening same URL on multiple tabs, POST requests to same endpoint but with different payloads) it becomes challenging to associate PerformanceResourceTiming entries with specific fetch events.  

   Performance entries use the requested URL as their identifier, but identical URLs result in multiple entries with no distinguishing tag linking them to respective clients or fetch operations. Identical URLs are common for POST requests to same endpoints with different body, and a current [workaround](https://github.com/w3c/resource-timing/issues/255#issuecomment-832196522) involves adding incremental ids as query strings to the URL, but custom query strings might be rejected by the host.

## Proposed Solution

### Add new `responseId` field to the PerformanceResourceTiming (Option 1)
Add a new read-only responseId field to the Response interface of the Fetch API, as well to the PerformanceResourceTiming interface. The user agent would be responsible for generating a unique identifier for each response it creates. This responseId could then be used to link a fetch Response to its corresponding resource timing data.

```webidl
interface Response  { 
  readonly attribute DOMString responseId;
}

interface PerformanceResourceTiming  { 
  readonly attribute DOMString responseId;
}
```

The payload of a performance.getEntriesByType("navigation") call would then look like: 

```
responseId: f943344a-2bb2-46ef-832f-2f0cb81c888f 
```

When querying PerformanceResourceTiming in the main thread or in a Service Worker context:

```js
// In the main thread or worker
fetch('https://api.example.com/data')  
.then(response => { 
     const responseId = response.responseId; 
     const matchingEntry = performance.getEntriesByType('resource')
                      .find(entry => entry.responseId === responseId); 
     console.log('Resource timing for the response:', matchingEntry); 
 }); 
```

Adding a responseId to the Response interface and PerformanceResourceTiming offers a streamlined, user agent-managed mechanism for correlating fetch responses with their associated performance data, improving traceability and simplifying debugging without requiring developer input. It also addresses the challenge of distinguishing multiple timing entries for identical fetch requests by providing a unique identifier for each response. 

However, this approach limits correlation with the original fetch request or FetchEvent, relies on user agents to securely generate unique IDs, and introduces potential fingerprinting risks if identifiers aren't properly partitioned and rotated. However, it can be mitigated by producing random, non-deterministic identifiers. Additionally, it requires updates to both the Fetch and Resource Timing specifications to ensure consistent behavior and privacy safeguards across implementations.

#### Example 1:  Using `responseId` for a resource request with the same url and multiple-tab scenario.
This example demonstrates how a web application can use a browser-generated responseId to correlate resource timing entries across the Service Worker and the main window. It solves a key problem in multi-tab scenarios where multiple clients request the same resource URL through a shared Service Worker by leveraging responseId.

```js
// Service Worker (sw.js)
self.addEventListener("fetch", (event) => { 
  if (event.request.destination === "image") { 
    event.respondWith((async () => { 
      const response = await fetch(event.request); 
      const entries = self.performance.getEntriesByType("resource"); 
      const timing = entries.find(e => e.responseId === response.responseId); 
      const responseStart = timing?.responseStart ?? self.performance.now(); 

      // Send responseId + timing info to the client 
      const client = await self.clients.get(event.clientId); 
      client?.postMessage({ 
        type: "SW_RESOURCE_TIMING", 
        responseId, 
        responseStart, 
        timeOrigin: self.performance.timeOrigin 
      }); 

      return response; 
    })()); 
  }
}); 
```

```js
// Main Window(main.js)
navigator.serviceWorker.onmessage = (event) => { 
  if (event.data?.type === "SW_RESOURCE_TIMING") { 
    const { responseId, responseStart, timeOrigin} = event.data; 
    const alignedSWResponseStart = 
      responseStart - (timeOrigin - performance.timeOrigin); 
    const matchingEntry = performance.getEntriesByType("resource") 
      .find(e => e.responseId === responseId); 

    if (matchingEntry) { 
      console.log("Matched resource in main window:", matchingEntry.name); 
      console.log("Client resource responseStart:", matchingEntry.responseStart); 
      console.log("SW responseStart (aligned):", alignedSWResponseStart); 
      console.log("TTFB delta:", matchingEntry.responseStart - alignedSWResponseStart); 
    } 
  } 
}; 
```
Using responseId allows developers to uniquely identify and correlate resource timing entries across the Service Worker and main window, even when multiple clients request the same URL. This enables accurate measurement of end-to-end latency, including how long it takes for a response to travel from the Service Worker to the main thread. 

 #### Example 2:  Using `responseId` for resource request for same url requests from a client.
 This example shows how a web app fetches the same resource multiple times (e.g., /data.json), and uses responseId to unambiguously associate each response with its corresponding PerformanceResourceTiming entry.

 ```js
 // Main Window (main.js)
 async function fetchAndIdentify(url) { 
  const response = await fetch(url); 
  const responseId = response.responseId; 

  await new Promise(resolve => setTimeout(resolve, 50)); 

  // Use responseId to uniquely identify the corresponding timing entry 
  const entry = performance.getEntriesByType("resource") 
    .find(e => e.responseId === responseId); 

  if (entry) { 
    console.log(`Found resource timing for fetch to ${url}`); 
    console.log(" → responseId:", responseId); 
  } else { 
    console.warn(`No matching resourceTiming found for responseId: ${responseId}`); 
  } 
} 

// Trigger multiple same-URL fetches 
fetchAndIdentify("/data.json"); 
fetchAndIdentify("/data.json"); 
fetchAndIdentify("/data.json"); 
 ```

Even though all three fetches use the same URL, responseId ensures that each one maps to its own unique resource timing entry, eliminating ambiguity. 
This is essential for tracking retries, performance audits, or analytics when multiple requests to the same resource occur within a session or across tabs.

## Alternative Considered Solutions

### Add `requestId` to the Fetch API (Option 2)
One considered proposal is to add optional requestId to the [RequestInit](https://fetch.spec.whatwg.org/#requestinit) dictionary of [Fetch method](https://fetch.spec.whatwg.org/#fetch-method) allowing developers to specify a unique identifier for a given fetch request to tag a specific request for tracing, debugging, or correlation across systems.

```webidl
dictionary RequestInit { 
  DOMString requestId;
} 
```

Developers can provide this identifier when calling fetch() or constructing a Request object. An example of how a web application might use the requestId with fetch:
```js
const request = new Request('https://api.example.com/data', {
method: 'GET',  
 requestId: '123e4567-e89b-12d3-a456-426614174000' 
}); 

fetch(request) 
.then(response => response.json()) 
.then(data => console.log(data)); 

Or

fetch('https://api.example.com/data', { 
  method: 'GET', 
  requestId: '123e4567-e89b-12d3-a456-426614174000'
}); 
```

If developer doesn’t provide a requestId, the user agent will generate a GUID automatically per each fetch to associate with the [Request](https://fetch.spec.whatwg.org/#request-class),  [Response](https://fetch.spec.whatwg.org/#response-class) and [PerformanceResourceTiming](https://www.w3.org/TR/resource-timing/#dom-performanceresourcetiming) entry.

1. **Add a new requestId field to the Request** <br>
   Adding a read-only `requestId` field on the Request interface.

    ```webidl
    [ Exposed=Window, Worker ] 
    interface Request { 
      readonly attribute DOMString requestId; 
    }
    ```

   The Fetch event.request property returns a Request object that represents the request being intercepted by a Service Worker. This Request object contains all relevant request information, including the new requestId. 

    ```js
    self.addEventListener('fetch', event => { 
      const request = event.request; 
      console.log(request.requestId); '123e4567-e89b-12d3-a456-426614174000' 
    }); 
    ```

2. **Add a new requestId field to the Response** <br>
    Adding a read-only 'requestId' field on the Response interface.

    ```webidl
    [ Exposed=Window, Worker ] 
    interface Response { 
      readonly attribute DOMString requestId;
    }
    ```
   The Response object has requestId along with other information like status, headers, body etc.

3. **Add a new requestId field to the PerformanceResourceTiming** <br>
    Adding a read-only 'requestId' field to PerformanceResourceTiming entries, allowing developers to correlate resource timing data with specific fetch requests.

    ```webidl
    interface PerformanceResourceTiming { 
      readonly attribute DOMString requestId; 
    }
    ```
    The payload of a performance.getEntriesByType("resource") or performance.getEntriesByType("navigation") call would then look like: 

    ```
    requestId: "123e4567-e89b-12d3-a456-426614174000"
    ```

    An example of how an application might use the requestId to get the resource timing info for a fetch. 

    ```js
    // Main thread
    const entries = performance.getEntriesByType('resource'); 
    const matching = entries.filter(entry => entry.requestId === '123e4567-e89b-12d3-a456-426614174000'); 
    ```

    In the FetchEvent of a Service Worker, developers can use the requestId to correlate navigation preloads or responses with resource timings. 

    ```js
    self.addEventListener('fetch', event => { 
        if (event.request.mode === "navigate") { 
            const requestId = event.request.requestId; 
            if (event.preloadResponse && event.preloadResponse instanceof Promise) {  
                event.preloadResponse.then((res) => {  
                    const entries = performance.getEntriesByType('resource');
                    const preloadEntry = entries.find(entry => entry.requestId === requestId); 
                    console.log('Navigation preload resource timing:', preloadEntry); 
                }); 
            }
        }  
    });
    ```

#### Browser-Initiated Requests
User agents initiate fetch processes for: 
* Navigation requests (clicking links, submitting forms, window.location.assign(), etc.) 
* DOM resource requests (images, CSS, scripts, fonts, media) 
* WebSocket and WebRTC handshakes 
* iframe and embed requests 
* Worker script loads. 

For these cases, the user agent would generate unique requestId values internally, allowing consistent correlation with PerformanceResourceTiming. Developers would not supply requestId values for these requests directly unless APIs are extended. 

#### Extensions for Other APIs (Optional/Future Work)
While fetch() is straightforward to extend, consistency across the platform would require consideration for: 
* Navigation APIs (e.g., navigation.navigate() with requestId) 
* DOM resources (e.g., new HTML attributes) 
* WebSocket and Worker APIs (e.g., accept requestId in constructors) 

However, rather than extending every API, user agents could automatically generate and manage requestId values for internal requests. 

This proposal enhances observability and traceability of fetch requests by enabling correlation between requests, responses, and resource timing entries via a consistent requestId. However, it introduces potential privacy and fingerprinting risks, as persistent or improperly scoped identifiers can enable cross-site tracking or user re-identification. Additionally, this approach requires changes to multiple specifications (Fetch, Request, Response, Resource Timing) and places a burden on developers, who must adopt and manage requestId in their applications to achieve full benefits. 

#### Why managing requestId is non-trivial: for the case devs provides requestId 
Developers need to ensure uniqueness, avoid leaking user/session data, and propagate IDs across their service boundaries. For developers to mitigate privacy and fingerprinting risks, the requestId generated would need to be random, non-deterministic identifiers. These UUIDs are ephemeral, scoped per navigation or session, and partitioned by origin, preventing reuse across different contexts. 

#### Example 1: Multi-tab scenario with the Service Worker for Navigation Preload request. 
This example shows how a Service Worker can handle navigation requests using a user-agent–generated requestId. Each client (e.g., tab) automatically gets a unique identifier for the navigation request, allowing precise correlation between the fetch, the response, and the corresponding PerformanceResourceTiming entry. 

```js
// Service Worker(sw.js)
self.addEventListener("fetch", (event) => { 
if (event.request.mode === "navigate") { 
  const requestId = event.request.requestId; 
  event.respondWith((async () => { 
    const response = await event.preloadResponse || await fetch(event.request); 

    const entries = self.performance.getEntriesByType("navigation"); 
    const timing = entries.find(e => e.requestId === requestId); 
    const responseStart = timing?.responseStart ?? self.performance.now(); 

    const client = await self.clients.get(event.resultingClientId); 

    client?.postMessage({ 
      type: "NAVIGATION_TIMING", 
      requestId, 
      responseStart, 
      timeOrigin: self.performance.timeOrigin 
    }); 

    return response; 
  })()); 
} 
}); 
```

```js
// Main Window(main.js)
navigator.serviceWorker.onmessage = (event) => { 
  if (event.data?.type === "NAVIGATION_TIMING") { 
    const { requestId, responseStart, timeOrigin } = event.data; 
    const adjustedStart = responseStart - (timeOrigin - performance.timeOrigin); 
    const matchingEntry = performance.getEntriesByType("navigation") 
      .find(e => e.requestId === requestId); 

    if (matchingEntry) { 
      console.log(`requestId: ${requestId}`); 
      console.log(`Client responseStart: ${matchingEntry.responseStart}`); 
      console.log(`SW responseStart (aligned): ${adjustedStart}`); 
      console.log(`TTFB delta: ${matchingEntry.responseStart - adjustedStart} ms`); 
    } 
  } 
}; 
```

This example solves the problem of multiple clients (e.g., tabs or iframes) requesting the same URL through a shared Service Worker by assigning a unique requestId to each navigation. The Service Worker uses requestId to retrieve the corresponding resource timing entry and send it back to the correct client. 

By aligning performance.timeOrigin across contexts, the client can accurately correlate the timing data and perform end-to-end analysis. This ensures each request is uniquely traceable from initiation to delivery, even when the navigation to same url happens by multiple clients simultaneously. 

#### Example 2: Fetching the same resource multiple time from a client
This example demonstrates how a web application can assign a unique requestId to each fetch() call and later use it to reliably identify the corresponding PerformanceResourceTiming entry. It solves the problem of disambiguating resource timing data when the same resource is fetched multiple times from the same URL. 

```js
async function fetchAndTrack(url) { 
  const requestId = crypto.randomUUID(); 
  const req = new Request(url, { requestId }); 
  const response = await fetch(req); 

  await new Promise(resolve => setTimeout(resolve, 100)); 

  const timingEntry = performance.getEntriesByType("resource") 
    .find(e => e.requestId === req.requestId); 

  if (timingEntry) { 
    console.log(`Matched resource timing for requestId  ${req.requestId}: ${timingEntry. responseStart}`);  
  } 
} 

// Trigger multiple same-URL fetches with distinct requestIds 
fetchAndTrack("/data.json"); 
fetchAndTrack("/data.json"); 
fetchAndTrack("/data.json"); 
```

When the same resource is fetched multiple times, all entries share the same name (URL), making them hard to distinguish. Using requestId ensures each fetch has a unique link to its performance entry, enabling precise tracking and analysis. 

### Add new `clientId` and `resultingClientId` field to the PerformanceResourceTiming (Option 3)

Another considered proposal is to add a new read-only `clientId` and `resultingClientId` fields to PerformanceResourceTiming interface. [FetchEvent](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/clientId) on the SW global scope gives info on the request along with [clientId](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/clientId) and [resultingClientId](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/resultingClientId) already which we want to associate it to PerformanceResourceTiming entry to help with mapping a resource timing back to the fetch. 

```webidl
interface PerformanceResourceTiming  {
    readonly attribute DOMString clientId; 
    readonly attribute DOMString resultingClientId; 
};
```

`clientId`: The identifier of the client that initiated the request. This corresponds to the clientId property of the FetchEvent that handled the request. This will be empty for a navigation request.

`resultingClientId`: The identifier of the resulting client. This corresponds to the resulting ClientId property of the FetchEvent, which may differ if the request results in a new client (e.g., navigation to a new document). This will be empty for a resource request.

When querying the Performance API for a navigation entry, the payload of a performance.getEntriesByType("navigation") call would look like:
```
clientId: ""
resultingClientId: "2dfa511d-2f0d-46b8-b173-2610dafbdc3f"
```

When querying the Performance API for a resource entry, the payload of a performance.getEntriesByType("resource") call would look like:
```
clientId: "2dfa511d-2f0d-46b8-b173-2610dafbdc3f"
resultingClientId: ""
```

This proposal provides a consistent way to associate PerformanceResourceTiming entries with their initiating client or navigation by exposing existing clientId and resultingClientId fields from the Service Worker FetchEvent. While it does not offer a direct correlation to individual fetch requests or resolve cases where the same resource is requested multiple times from the same URL by one or multiple clients, it improves traceability of resource loads, enabling developers to measure Service Worker processing time, analyze navigation preload behavior, and optimize resource loading in multi-tab or multi-client scenarios. The scope of changes is limited to the PerformanceResourceTiming specification, leveraging existing identifiers without introducing new user tracking vectors or increasing fingerprinting risks.

#### Example: Using `resultingClientId` for Navigation preload requests for multi-tab scenario
The following example demonstrates how a web application can correlate navigation timing observed in the main window with the timing of the response as seen by the Service Worker. It captures when the first byte (TTFB) of the response was received in both contexts and aligns their timelines using performance.timeOrigin, leveraging the resultingClientId property for precise matching. 

By aligning performance.timeOrigin between the Service Worker and the main window, we can accurately determine: 
* When the Service Worker received the first byte of the response 
* How long it took for that byte to be delivered to the main thread 
```js
// Service Worker(sw.js)
self.addEventListener("fetch", (event) => { 
  if (event.request.mode === "navigate") { 
    event.respondWith((async () => { 
      let response = await event.preloadResponse; 
      if (!response) { 
        response = await fetch(event.request); 
      } 

      // Find timing info for the preloaded navigation using resultingClientId 
      const entries = self.performance.getEntriesByType("navigation"); 
      const timing = entries.find(e => e.resultingClientId === event.resultingClientId); 
      const responseStart = timing?.responseStart ?? self.performance.now(); 
      const client = await self.clients.get(event. resultingClientId); 

      client?.postMessage({ 
        type: "SW_TIMING", 
        responseStart, 
        timeOrigin: self.performance.timeOrigin 
      });

      return response; 
    })()); 
  } 
}); 
```

```js
// Main Window(main.js)
navigator.serviceWorker.onmessage = (event) => { 
  if (event.data?.type === "SW_TIMING") { 
    const navEntry = performance.getEntriesByType("navigation")[0]; 
    const adjustedSWResponseStart = event.data.responseStart - (event.data.timeOrigin - performance.timeOrigin); 

    console.log("Client responseStart:", navEntry.responseStart); 
    console.log("SW responseStart (aligned):", adjustedSWResponseStart); 
    console.log("TTFB delta (client - SW):", navEntry.responseStart - adjustedSWResponseStart); 
  } 
}; 
```

Example output:
```
Client responseStart: 230.88 
SW responseStart (aligned): 215.50 
TTFB delta (client - SW): 15.38 ms 
```

### Options Evaluation

| **Criteria** | **Option1** | **Option2** | **Option3** |
| ------------ | ----------- | ----------- | ----------- |
|Direct client/tab mapping to resource timings | ✅ In SW context, client mapping information can be indirectly obtained by filtering the resource timing entries using the responseId and then associating it with the FetchEvent's clientId. | ✅  In SW context, client mapping information can be indirectly obtained by filtering the resource timing entries using the requestId and then associating it with the FetchEvent's clientId. | ✅ |
|Distinguish between multiple identical requests from the same client. | ✅ | ✅ | ❌ |
|Distinguish between identical requests from different clients. | ✅ |✅ | ✅ |
|Enables end-to-end correlation between requests, responses, and resource timings.| ❌ |✅| ❌ |
|Leverages existing identifiers (FetchEvent).| ❌ | ❌ | ✅ |
|Developers do not need to generate and manage RequestIds | ✅ |❌| ✅ |
|User agents do not need to generate and manage Ids.|❌ |❌| ✅ |
|Spec Changes Required| Moderate. Changes to Fetch spec for Response and resource timing spec. | Broad. Changes to Fetch spec for Fetch, Request, Response APIs, and resource timing spec. | Minimal. Only updates to resource timing. |
|Privacy considerations| Medium risk. Can be mitigated if UA generates the random/non-guessable ids. |Medium risk. UA generated ones can be mitigated. Developers must also generate random, ephemeral Ids| Low risk. Uses existing identifiers already exposed in SW context (FetchEvent). |
|BestFor| Scenarios where developers need to correlate a response object with its performance data.|Scenarios requiring granular fetch request tracking, even for duplicate URLs. | Scenarios where developers need to know which client (tab/iframe) initiated or resulted from a request, especially for navigation preload requests |
|Use in Service Worker Context?|✅ Allows tracing the response in SW to its performance timing but lacks client context for preload requests but can be obtained with custom logic by the developer. |✅ requestId can be carried across the SW lifecycle and responses. | ✅ Enables mapping resource timing entries for navigation preloads or multi-client cases back to the right tab/client. |
## Privacy and Security Considerations

### Privacy

Adding 'clientId' and 'resultingClientId' fields to PerformanceResourceTiming introduces additional attributes to an existing fingerprinting surface. However, since this information is already exposed in the Service Worker context through [FetchEvent](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent), and because the identifiers are user-agent-generated and scoped appropriately, the privacy risk is considered low. These IDs are ephemeral, rotating on a per-session or per-navigation basis, and are not stable across browsing sessions or different contexts. 

In line with existing privacy protections, PerformanceResourceTiming restricts detailed information on cross-origin resources unless explicitly permitted via the Timing-Allow-Origin (TAO) header. This proposal follows the same policy: clientId and resultingClientId will only be exposed for same-origin resources by default, and access to these identifiers on cross-origin resources will require TAO opt-in.

Additionally, the PerformanceResourceTiming API is governed by existing browser security models and Permissions-Policy. Any restrictions currently in place for resource timing exposure will automatically apply to these new fields, ensuring consistency with user agent privacy configurations and secure browsing modes. 

### Security

These two fields also follow security considerations of PerformanceResourceTiming restricted to same-origin contexts, respecting existing browser security models and permissions policies and maintaining the security guarantee on the resource timing and fetch data. 

### Reference & acknowledgements

[Resource timing spec issue](https://github.com/w3c/resource-timing/issues/259)

[Resource timing API](https://www.w3.org/TR/resource-timing/#dom-performanceresourcetiming)

Many thanks for valuable feedback and advice from:
- [Todd Reifsteck](https://github.com/toddreifsteck)
- [Liang Zhao](https://github.com/LiangTheDev)
- [Andy Luhrs](https://github.com/aluhrs13)
