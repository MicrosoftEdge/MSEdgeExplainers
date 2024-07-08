# Enabling Web Applications to understand bimodal performance timings

The purpose of this document is to propose changes to the [Performance Navigation Timing API](https://w3c.github.io/navigation-timing/#dom-performancenavigationtiming) allowing website owners to understand how the performance of their applications is impacted by causes of entropy on a user machine (e.g. cold start, system load, etc.) without providing an additional fingerprinting surface.

Authors:
* [Heming Zhang](https://github.com/hemingzh) - Engineer at Microsoft Edge
* [Dylan Kelly](https://github.com/dylank) - Engineer at Microsoft Edge
* [Ben Mathwig](https://github.com/bmathwig) - Product Manager at Microsoft Edge
* [Mike Jackson](https://github.com/mwjacksonmsft) - Engineer at Microsoft Edge

## Status of this Document
This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.
* This document status: **Active**
* Expected venue: [W3C Web Incubator Community Group](https://wicg.io/)
* **Current version: this document**

## Introduction
Web applications may suffer from bimodal distribution in page load performance, due to factors outside of the web application’s control. For example:
* When a user agent first launches (a "cold start" scenario), it must perform many expensive initialization tasks that compete for resources on the system.
* Browser extensions can affect the performance of a website. For instance, some extensions run additional code on every page you visit, which can increase CPU usage and result in slower response times.
* When a machine is busy performing intensive tasks, it can lead to slower loading of web pages.

In these scenarios, content the web app attempts to load will be in competition with other work happening on the system. This makes it difficult to detect if performance issues exist within web applications themselves, or because of external factors.

Teams we have worked with have been surprised at the difference between real-world dashboard metrics and what they observe in page profiling tools. Without more information, it is challenging for developers to understand if (and when) their applications may be misbehaving or are simply being loaded in a contended period. To address this, we propose adding new information to the existing Web Performance APIs.


[Performance Navigation Timing](https://w3c.github.io/navigation-timing/#dom-performancenavigationtiming) provides a variety of performance measurements. A typical response for `performance.getEntriesByType("navigation")` will produce something like:

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
type: "navigate"
unloadEventEnd: 0
unloadEventStart: 0
workerStart: 125.90000003576279
```

Under normal conditions, if fetchStart (or redirectStart) minus startTime is exceedingly high, one might assume the cause was due to the user agent. Similarly, a large gap between domainLookupEnd and domainLookupStart could suggest DNS issues. However, performance spikes can appear at any point across the navigation timeline if the page is loaded during a contended period making these assumptions invalid.

![Image](./timestamp-diagram.png)

## Goals
The proposed changes in this document aim to enable web application developers to pivot performance telemetry of their web application to eliminate outlier metrics due to user-agent resource contention.

## Non-Goals
 * Distinguishing between various implementation-specific startup processes.
 * Signaling browser launches which do not involve a full browser initialization (e.g., restoring a session from a suspended state on mobile platforms).
 * Identifying specific external factors causing page load contention.

## Use Cases
 * A web application which typically runs as an installed PWA (progressive web apps) that might get launched without a user agent already running. E.g., PWA’s that run during OS (operating systems) login.
 * A web application which runs as the user's homepage.

## Proposed Solution

### Add new 'confidence' field to PerformanceNavigationTiming

To enable developers to discern if the navigation timings are representative for their web application, we propose adding a new ‘confidence’ field to the PerformanceNavigationTiming struct.

```javascript
enum NavigationConfidence {
    "high",
    "low"
};

interface PerformanceNavigationTimingConfidence {
    readonly attribute double randomizedTriggerRate;
    readonly attribute NavigationConfidence value;
    [CallWith=ScriptState] object toJSON();
};

```

The payload of a performance.getEntriesByType("navigation") call would then look like:

```javascript
confidence: {value: "high", randomizedTriggerRate: 0.5}
connectEnd: 126.19999998807907
connectStart: 126.19999998807907
<snip>
unloadEventStart: 0
```

This work aims to prevent any new ways of fingerprinting users. The scope of privacy in this proposal is at the source level, consequently, the user agent should add noise to this field so that an aggregator can debias the data, but individual records can not used to track users. Noise should be added to this field via randomized response algorithm:

* Flips a coin with heads probability p
* If heads, return the correct 'confidence' value.
* If tails, flip a coin, and answer 'high' if heads, 'low' if tails.

Assuming that p is 50%, then if the true value of the confidence field is 'high', then there is a 75% chance that 'high' will be returned, and a 25% change 'low' will be returned. The probabilities are reversed if the true value of the confidence field is 'low. The value of p is subject to to change with feedback. Using differential privacy terminology, the value of epsilon for this algorithm is 1.1.

The noise added means that the 'confidence' field isn’t immediately useful to developers. Developers can collect this field in their Real User Monitoring (RUM) data and with enough records, correct the data to "eliminate the noise" while also safeguarding a single user’s privacy.

An example of an algorithm to debias the data is:

```python
epsilon = 1.1
p = 2 / (1 + np.exp(epsilon))
# confidence_order is an array that contains high or normal values.
# e.g. ['low', 'low', 'high', 'high', 'low', ...]
# all_times_in_ms is an array that contains all the PerformanceEntry.duration
# times that correspond to confidence_order.
#
# The result of these two lines is two arrays containing either ~1.5 or ~-0.5
# e.g. [1.4989606589731945, 1.4989606589731945, -0.4989606589731945, -0.4989606589731945, 1.4989606589731945, ...]
est_high_times = ((confidence_order == "high") - p / 2) / (1 - p)
est_low_times = ((confidence_order == "low") - p / 2) / (1 - p)

est_high_mean = (sum(est_high_times * all_times_in_ms) / sum(est_high_times))
est_low_mean = (sum(est_low_times * all_times_in_ms) / sum(est_low_times))
```

## Alternative Considered Solutions

### Add new NavigationType value for PerformanceNavigationTiming

One considered proposal was to create a new value for the NavigationType enum to differentiate navigations during launch from others in measurements of web application performance. Launch was specifically selected as that is the most common use case. The new enum definition will appear as follows:

```javascript
enum NavigationType {
    "navigate",
    "reload",
    "back_forward",
    "prerender",
    "navigate_during_user_agent_launch", <== New
};
```

The payload of a performance.getEntriesByType("navigation") call would look like:

```javascript
connectEnd: 126.19999998807907
connectStart: 126.19999998807907
<snip>
transferSize: 300
type: "navigate_during_user_agent_launch"
unloadEventEnd: 0
unloadEventStart: 0
workerStart: 125.90000003576279
```

An example of how a web application might use this:

```javascript
const navigationEntries = window.performance.getEntriesByType('navigation');
let navigationType;
if (navigationEntries.length > 0) {
    const navigationEntry = navigationEntries[0];
    navigationType = navigationEntry.type || 'UndefinedType';
} else {
    navigationType = 'none';
}
```

However, these other navigation types can also occur, albeit less frequently, during a non-optimal performance state. It seems impractical to introduce a new enum for each existing navigation type, especially as it complicates the mapping to the historyHandling type. Also consider that as other cases become more common, we would be expanding the potential test matrix.

### Add new Type value for performance.getEntriesByType

In this proposal, we would add a new type to performance.getEntriesByType, to highlight the browser’s performance during times when the browser was operating during a non-optimal performance state. These entries would also appear in their original category.

For example, if navigation occurred during a cold launch of the browser, then a PerformanceNavigationTiming object would be returned by both calls:

```javascript
const navigationEntries = window.performance.getEntriesByType('navigation');
const navigationUnderLoadEntries = window.performance.getEntriesByType('navigation_under_load');
```

However, there are two main drawbacks to this approach:
 1. We would need to consider introducing similar concepts for each PerformanceEntry subclass.
 2. Developers need to write additional code to match up this new entry type with the existing entry to ensure it was excluded from their measurements.

A variation of this to avoid adding the item to both categories, which mitigates (2), but does not resolve (1).

### Introduce new ancillary data

This proposal would introduce a new ancillary data structure that contains interesting values to be captured.

```webidl
interface PerformanceNavigationTimingAdditionalData {
    readonly attribute double randomizedTriggerRate;
    readonly attribute boolean startTimeDuringUserAgentLoad;
    [CallWith=ScriptState] object toJSON();
};

[
    Exposed=Window
]  interface PerformanceNavigationTiming : PerformanceResourceTiming {
    readonly attribute PerformanceNavigationTimingAdditionalData? additionalData;
};

```
The payload of a performance.getEntriesByType("navigation") call would look like:

```javascript
activationStart: 0
additionalData: PerformanceNavigationTimingAdditionalData
  randomizedTriggerRate: 0.0024
  startTimeDuringUserAgentLoad: true
connectEnd: 154.09999990463257
<snip>
```

This proposal was rejected because the more information you reveal the more noise you will need to add to maintain source level privacy. For example, if we were to evolve the data structure to look like this:

```webidl

enum PressureState {
    "nominal",
    "fair",
    "serious",
    "critical"
};

interface PerformanceNavigationTimingAdditionalData {
    readonly attribute double randomizedTriggerRate;
    readonly attribute boolean startTimeDuringUserAgentLoad;
    readonly attribute PressureState cpuPressureState;
    readonly attribute PressureState thermalsPressureState;
    readonly attribute PressureState userAgentPressureState;
    readonly attribute PressureState gpuPressureState;
    [CallWith=ScriptState] object toJSON();
};
```

There would be 2 * 4 * 4 * 4 * 4 = 512 possible states encodable, and we'd need to apply kary-randomized response.The flip probability for kary-randomized response is p = k / (k - 1 + exp(epsilon)). This is ~99.6% for k=512 and an epsilon value of 1.1. There are a few options we could consider:

1. We could consider regressing the privacy bar, by protecting these attributes separately, but differential privacy algorithms are composable resulting in significantly reduced privacy for the user.
2. Choose a different privacy mechanism than randomized response. This may come at a cost of complexity (both in the mechanism and in the debiasing step).

There are two additional concerns with this approach:

1. This approach doesn't uphold the principal of [data minimization](https://w3ctag.github.io/privacy-principles/#data-minimization).
1. Given the high flip probability, there may not be enough data in a particular bucket to successfully debias the data.

### Navigation Timing Report

Allow developers to receive reports via a new [Reporting-Endpoints](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Reporting-Endpoints) response header.

```
Reporting-Endpoints: navigationTiming-endpoint="https://example.com/nav-reports"
Navigation-Timing: report-to=navigationTiming-endpoint
```

The payload of the report would look like:

```
{
  "type": "navigation-timing",
  "age": 10,
  "url": "https://example.com/",
  "user_agent": "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/60.0",
  "body": {
    "activationStart": 0,
    "additionalData": {
       "randomizedTriggerRate": 0.0024,
       "startTimeDuringUserAgentLoad": true
    }
    "connectEnd": 154.09999990463257,
    <snip>
  }
}
```

The info could also be made available via ReportingObserver.

```javascript
const options = { types: ["navigation-timing"], buffered: true, };
const observer = new ReportingObserver((reports, observer) => {
  console.log(firstReport.body.additionalData.startTimeDuringUserAgentLoad);
}, options);
```

The main drawback to this approach is that additional page specific data can not be easily bundled with entry. For example, it would be more difficult to associate this data with an a/b experiment.

### Add new systemEntropy field to PerformanceNavigationTiming

To enable developers to discern if the page load occurs during a non-optimal performance state, we will add a new ‘systemEntropy’ field to the PerformanceNavigationTiming struct. This would be a new enum representing the state of the user agent at the time the navigation was started.

```javascript
enum NavigationEntropy {
    "high",
    "normal"
};
```
The payload of a performance.getEntriesByType("navigation") call would look like:

```javascript
connectEnd: 126.19999998807907
connectStart: 126.19999998807907
<snip>
serverTiming: []
startTime: 0
systemEntropy: "high"
transferSize: 300
type: "navigate"
unloadEventEnd: 0
unloadEventStart: 0
```
An example of how a web application might use this:

```javascript
const navigationEntries = window.performance.getEntriesByType('navigation');
let navigationType = 'none';
if (navigationEntries.length > 0) {
    const navigationEntry = navigationEntries[0];
    // If the systemEntropy is high, return navigationType 'none'
    // to drop the event.
    if (navigationEntry.systemEntropy !== 'high') {
        navigationType = navigationEntry.type || 'UndefinedType';
   }
}
```

This solution could also be easily extended to other performance structures if so desired. It also allows the user agent to decide what high vs normal systemEntropy might mean, and potentially extend the enum later providing more granularity for consumers of the API (e.g., ‘medium’ or 'veryHigh’).

This solution was rejected because its very similar to functionality to 'confidence', but with a more confusing name.

## Privacy and Security Considerations

### Privacy

Tagging a PerformanceNavigationTiming with `confidence` exposes a new means for sites to infer whether the site was launched during user agent start up or make inferences about other machine capabilities. For example, sites might infer that their site is set as the user’s home page. Introducing noise via a local randomized response should mitigate this issue.

- **Detectability**: The user agent is aware that it is emitting this signal whenever it decides that 'low' confidence is a suitable return value. However, it is of course not possible for the user agent to know how this signal is handled by the origin once it has already been received.

- **Persistence**: This signal is not directly associated with any user state or data that persists throughout a browsing session. A site could choose to persist this signal in a cookie or similar storage.

- **Availability**: The signal is not available during any other browsing activity.

- **Scope**: This surface would be made available as a modification to the PerformanceNavigationTiming interface, which can be requested by any scripts running on the page.

No other meaningful privacy concerns are expected, but we welcome community feedback.

### Security

This proposal supplies more evidence for sites to infer that a machine might be under heavy load. However, this information is indicative of the past state of the browser, and does not reflect, nor provide a way to query for the current performance state of the browser.


## Open Questions

## Conclusion

As outlined, it can be frustrating for application developers to identify and root-cause performance issues when load times are influenced by other environmental factors like resource contention during a user agent launch. By modifying the `PerformanceNavigationTiming` API, web applications developers can have better insight into the conditions of their application's performance and remove noise in diagnosing performance metrics which will benefit the web apps ecosystem.

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Performance) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=dylank%2C+hemingzh&labels=Perf+timing+during+browser+start&template=performance-timing-during-browser-start.md&title=%5BPerf+Timing+during+launch%5D+%3CTITLE+HERE%3E)
