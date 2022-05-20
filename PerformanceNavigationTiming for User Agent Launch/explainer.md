# Enabling Web Applications to understand performance timings during launch

The purpose of this document is to propose changes to the [Performance Navigation Timing API](https://w3c.github.io/navigation-timing/#dom-performancenavigationtiming) which will enable website owners to understand how the performance of their applications are affected by user agent launch scenarios. 

Authors:
* [Heming Zhang](https://github.com/hemingzh) - Engineer at Microsoft Edge
* [Dylan Kelly](https://github.com/dylank) - Engineer at Microsoft Edge

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* **Current version: this document**

## Introduction
When a user agent first launches (a "cold start" scenario), it must perform many expensive initialization tasks that compete for resources on the system. As a consequence, web applications may suffer from bimodal distribution in page load performance if they attempt to load at this time as they also compete for rendering and their own initialization. This makes it difficult to detect if performance issues exist within web applications themselves or because of a user-agent condition when resources are in high contention. This is particularly a pain point for pinned PWAs or WebView apps that will often require a cold start of the user agent.

## Goals
The proposed changes in this document aim to enable web applications to:
 * have an understanding of how they were created.
 * make functional decisions when they know they are in a high resource contention scenario.
 * filter and pivot their performance telemetry on navigation type to better detect performance issues and regressions.

## Non-Goals
 * Distinguishing between various implementation-specific startup processes.
 * Signaling browser launches which don't involve a full browser initialization (e.g. restoring a session from a suspended state on mobile platforms).
 * Providing other information related to browser performance conditions, outside the scenario of a cold start launch and initialization.

## Use Cases
 * a web application which typically runs as an installed PWA that might get launched without a user agent already running.
 * a web application which runs as the user's homepage.

## Proposed Solution

### PerformanceNavigationTiming

A typical response for `performance.getEntriesByType("navigation")` will produce something like:
```javascript
connectEnd: 126.19999998807907
connectStart: 126.19999998807907
decodedBodySize: 0
domComplete: 2721.300000011921
domContentLoadedEventEnd: 302.30000001192093
domContentLoadedEventStart: 302.30000001192093
domInteractive: 302.30000001192093
domainLookupEnd: 126.19999998807907
domainLookupStart: 126.19999998807907
duration: 2721.400000035763
encodedBodySize: 0
entryType: "navigation"
fetchStart: 126.19999998807907
initiatorType: "navigation"
loadEventEnd: 2721.400000035763
loadEventStart: 2721.300000011921
name: "https://www.office.com/mail/inbox"
nextHopProtocol: "h2"
redirectCount: 1
redirectEnd: 122.40000003576279
redirectStart: 13.300000011920929
requestStart: 126.19999998807907
responseEnd: 138
responseStart: 132
secureConnectionStart: 126.19999998807907
serverTiming: []
startTime: 0
transferSize: 300
type: "navigate"  <== NavigationType
unloadEventEnd: 0
unloadEventStart: 0
workerStart: 125.90000003576279
```

Despite the variety of performance measurements available through the current API, it's difficult to discern from the `NavigationType` whether the measurements reflect those of a regular navigation under normal browsing, or of one where the browser is in a non-optimal performance state. As a launch is one of the most heavyweight performance scenarios commonly encountered in typical browser usage, and as application performance under this scenario does not reflect that of a normal navigation, our proposal seeks to create a new value for the `NavigationType` enum to differentiate this condition from others in measurements of web application performance.

Modifying the `NavigationType` to include state for a user agent launch (i.e. `useragent_launch`) will enable engineers to determine whether a given measurement is taken from a launch scenario, enabling greater differentiation of application performance from browser performance in scenarios where the browser engine is launched and terminated frequently (e.g. in Electron apps, system webviews, or other application scenarios where the browser is relatively short-lived or commonly launched from scratch). The new enum definition will appear as follows:

```javascript
enum NavigationType {
    "navigate",
    "reload",
    "back_forward",
    "prerender",
    "useragent_launch", <== New
};
``` 

There is some concern this might break some pages that assume the `NavigationType` enum is fixed, and that the new `"useragent_launch"` navigation type will take away some portion of traffic that is currently classified as `"navigate"`. However, since the enum has already been expanded before to introduce `"prerender"`, we expect that web developers may have already adjusted the way they capture performance metrics. Furthermore, we expect this change to mostly impact web applications which commonly load during browser launch. For others, it is likely that they will observe no changes in their metrics since most navigation types will continue to be `"navigate"`.

An example of how a web application might use this:

```javascript
const navigationEntries = window.performance.getEntriesByType('navigation');
let navigationType;
if (navigationEntries.length > 0) {
    const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming;
    navigationType = navigationEntry.type || 'UndefinedType';
} else {
    navigationType = 'none';
}

// send log with the navigationType
```

## Privacy and Security Considerations

### Privacy

Tagging a PerformanceNavigationTiming with `useragent_launch` exposes a new means for sites to infer whether the site is the user's home page. This will mean that `example.com` could infer that a user has `example.com` configured as their home page within a web browser. However, since this only information that `example.com` can figure out about itself, and not information that other applications can find out, we do not consider this a significant concern given the benefit this change will provide. Additionally, such inference suffers from false-positives, as the user may have invoked the URL and launched the browser from the OS shell or another non-browser application.

An analysis of fingerprinting capability provided by this surface suggests fairly limited impact.

- **Entropy Introduced**: This change introduces one new potential enum value, and alone could be said to introduce one additional bit of entropy (whether or not the user has ever had the new `useragent_launch` enum value returned on a given origin). However, as this value is only obtained in navigations during browser launch, its presence could be considered to be fairly distinguishing when aggregated with other fingerprinting signals.

- **Detectability**: The user agent is aware that it is emitting this signal whenever it determines that `useragent_launch` is an appropriate return value. However, it is of course not possible for the user agent to know how this signal is handled by the origin once it has already been received.

- **Persistence**: This signal is only generated by a browser launch condition and isn't directly associated with any user state or data that persists throughout a browsing session. A site could choose to persist this signal in a cookie or similar storage.

- **Availability**: This signal is only exposed once, after browser launch, to web pages that were immediately activated as a result. The signal is not available during any other browsing activity.

- **Scope**: This surface would be made available as a modification to the `PerformanceNavigationTiming` interface, which can be requested by any scripts running on the page. However, we can enforce a same-origin policy for returning this value in our implementation to limit the scope of the signal to the same origin which requests it.

No other meaningful privacy concerns are anticipated, but we welcome community feedback.

## Open Questions

## Conclusion
As outlined, it can be frustrating for application developers to identify and root-cause performance issues when load times that are influenced by other environmental factors like resource contention during a user agent launch. By modifying the `PerformanceNavigationTiming` API, web applications developers can have better insight into the conditions of their application's performance and remove noise in diagnosing performance metrics which will benefit the web apps ecosystem.

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Performance) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=dylank%2C+hemingzh&labels=Perf+timing+during+browser+start&template=performance-timing-during-browser-start.md&title=%5BPerf+Timing+during+launch%5D+%3CTITLE+HERE%3E)
