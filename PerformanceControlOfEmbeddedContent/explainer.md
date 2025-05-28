---
tags: explainer, brainstorming
title: Performance Control of Embedded Content
label: PerformanceControlOfEmbeddedContent 
owner: nishitha-burman
venue: Web Perf
---

# Performance control of embedded content

## Authors
- [Nishitha Burman Dey](https://github.com/nishitha-burman)
- [Luis Flores](https://github.com/lflores-ms)
- [Andy Luhrs](https://github.com/aluhrs13)
- [Alex Russell](https://github.com/slightlyoff)

## Introduction

This document proposes platform functionality to give embedders (browsers, websites, hosting applications) the ability to put constraints on resources allocated to embedees (tabs, iframes, WebViews) to minimize the performance impact that embedded web content can have on an user’s device. Additionally, violations of the constraints will be reported to the embedder to inform and improve the ecosystem.

Embedder developers can do this by setting policies that constrain the performance impacting features of the embedee. If those constraints are violated, they are reported to the embedder and embedee to:
1.  Inform the embedder so it can make decisions accordingly, to make the right tradeoffs for their app and give their users an optimal experience.
2.  Inform the embedee so they can be aware of issues and learn about improvement opportunities.

Additionally, embedders can opt into default behavior the platform makes to address violations.

## Goals

With global web usage continuing to rise and more companies relying on the web as a primary platform to deliver their applications, performance has become a critical factor for success. As more users access websites through mobile devices and lower-powered hardware, the need for fast responsive web experiences is non-negotiable[^1],[^2].

When it comes to optimizing performance, websites and apps are limited by the performance of the external content they embed; these can be 3rd party sites, 3rd party apps, and even content from other organizations within a company. Additionally, in cases where heavyweight apps transition to embedded scenarios, they may be optimized for standalone use but cause issues in an embedded context, impacting the overall performance of the app. As a result, being able to control the performance of embedded content is crucial to improving the overall performance of a site or app.

This proposal has two primary goals:
1.	Improve users’ satisfaction with their OS, browser, and applications via formalizing methods of constraining the resources available to web content, while removing the burden of determining individual constraints from web developers.
2.	Provide information to help developers understand the performance of web sites and apps through reporting when performance is negatively impacting end-users and/or applications hosting the site in a frame.

## Non-goals

1. Granular control of limits for each policy. **The developer will not have control over granular values of limits or criteria for each policy. Policies and limits are determined by the platform.** The key factor of this solution is there are predefined policies constraining focused, perf impacting features that embedder developers can set to enforce restrictions on the embedded content in their app/site. This is to simplify the process and remove the burden from the embedder developer to determine individual constraints.

## Use cases and scenarios

Embedded content can unintentionally or deliberately consume disproportionate resources on a device, resulting in a negative user experience. This impact may result in visibly slow-loading websites that frustrate users or less apparent issues like increased battery drain and excessive network bandwidth consumption. Some examples include:

1. **Embedded widgets (weather forecast, stock tickets, social media, etc.)**
  * Heavy video and animation widget: A feeds app has a weather widget that contains complex animations, high-definition videos, and auto-play functionality for different weather conditions (heavy snowfall or pouring rain) without user interaction. This leads to significant battery drain due to prolonged hardware activity and excessive bandwidth consumption from streaming or rendering large assets. To address this issue, the feeds app may set constraints such as asset size limits, require assets are zipped, and require video/animations to pause when user is not interacting with them.
2. **Embedded ads from external providers**
  * Cryptojacking ads: A site is using a 3rd party ad provider however the ad contains malicious code designed to run cryptocurrency mining scripts in the background using the user's CPU or GPU resources without their knowledge. This drains the device resources and impacts performance. To avoid such issues, the website owner (embedder) could set performance constraints on the ad by limiting the JavaScript execution or restricting excessive network or CPU usage.
3. **Embedded calendars from services**
  * Calendar with a heavy framework: An app embeds a calendar to display upcoming events however the embedded calendar loads a full-featured JavaScript framework like Angular or React just to render a simple monthly view. Poorly optimized code results in unnecessary large network payloads and inefficient rendering, causing visible lag during simple user interactions (scrolling or mouse movements). To address these issues, the app can set constraints on the embedded calendar for loading and JavaScript execution times. Through the reporting mechanism, the embedded app may learn that they can make optimizations such as reducing the bundle size, avoiding the need for full frameworks, and use simple solutions for rendering the calendar.

## Proposed Solution

> **Note:** This proposal is grounded in experience working with embedded web content and evaluation of numerous websites. We've identified recurring issues that can lead well-intentioned web content to unintentionally deliver suboptimal user experiences. We have formalized patterns of recurring issues into **categories** (policies) comprised of various **criteria** items. The categories and criteria are open to modification and the limits will be determined based on data, from sources like the [Web Almanac](https://almanac.httparchive.org/en/2024/), and feedback from experts. Additionally, the threshold/limits and specific criteria within a category may evolve over time and is determined by the platform.

Introduce [Document Policy](https://github.com/WICG/document-policy/blob/main/document-policy-explainer.md) configuration points, one for each of the following performance-impacting categories:

* A: `basic`
* B: `early-script`
* C: `globals`
* D: `script`

> **Note:** Names here are only monikers and expected to change.

This enables each document to:
* Self-impose performance constraints.
* Negotiate constraints (see [discussion section](#opt-in-and-policy-negotiation)) for each subresource.


### Categories and criteria

| **Perf. Category** | **Criteria** | **Handling violations** |
| -------------  | -------- | ------------------- |
| **A: Basic**<br>**Description**: Basic web development best practices that are scenario-agnostic. | **- Text resources must be compressed** (HTML, CSS, JS, JSON).<br> - **Unzipped assets are flagged.**<br> - **Oversized assets are flagged:**<br>* Assets larger than ?KB embedded via `data:...` URLs.<br>* Image files larger than ?KB served in last generation formats.<br> * Web fonts that are larger than ?KB. | - Reporting violations via Reporting API.<br> - Assets not rendered.<br> UI indicator to block out images that are too large. |
| **B: Early-script**<br>**Description**: JavaScript constraints during load to enhance performance and minimize impact on user experience before interaction begins. | **- JS limits:**<br>* Total limits on JS served prior to user interaction: ?MB<br>* Scripts must contain `content-length` headers<br>* No non-compositor thread animations (e.g. animated SVGs, loading spinners, etc.). | - Report violations via Reporting API.<br> - Loading of scripts that violate the limit are paused/blocked.<br> - Pause/disconnect animations that are not visible, interacted with. |
| **C: Globals**<br>**Description:** Overall media and system resource usage constraints. | **- Cumulative resource consumption limits per interaction:**<br>* Caps on total media usage. No more than a total of ?.<br>* Limits on iframe count. No more than a total of ?.<br>* Limits of iframe depth. No more than a depth of ?.<br>* CPU usage before first interaction: ?%. | - Report violations via Reporting API.<br>- Do not load media at all. <br>- Do not load iframes that surpass the depth. |
| **D: Script**<br>**Description:** Strict JavaScript restrictions while running/post-load. | **-Additional JS limits:**<br>* Long tasks in the main thread.<br>* High CPU usage.<br>* Workers with long tasks that exceed ?ms.<br> | - Report violations via Reporting API.<br>- Stopping JavaScript if [no user interaction/running in the background]. |

### Discussion of different categories

**A: Basic – Basic web development best practices that are scenario-agnostic:** This category encompasses fundamental web development best practices to ensure websites are optimized for performance across various environments. These tasks are typically simple to implement but are frequently overlooked, leading to significant performance issues.

**B: Early-script – JavaScript constraints to enhance performance and minimize impact on user experience before interaction begins:** This category focuses on JavaScript development best practices that can be done to minimize performance issues before user interaction begins. This includes capping JavaScript resources loaded initially to avoid overwhelming devices with limited processing power or bandwidth, and serving JavaScript with constrained content-length headers to ensure predictable resource delivery and prevent bloated downloads. Additionally, animations that don’t run on the compositor thread should be avoided, as they can trigger costly layout recalculations and choppy user experiences, especially during page load or scroll events.

**C: Globals – Overall media and system resource usage constraints:** This category entails imposing limits on overall media and system resource usage during interactions to help prevent websites from over-consuming resources and degrading user experiences. This includes capping total media usage and iframe count/nesting to avoid excessive memory consumption and rendering issues because it can slow down the page and make it unresponsive, particularly on lower-end devices or in resource-constrained environments.

**D: Script – Strict JavaScript restrictions:** This category enforces restrictions on more complex JavaScript to further enhance performance. This includes limiting long tasks running on the main thread as they block the event loop and degrade interactivity leading to slow response times, and capping high CPU usage tasks, particularly those involving workers that exceed certain execution times, to ensure they don’t monopolize system resources. These restrictions ensure that JavaScript execution remains lightweight and efficient, preventing detrimental performance impacts on the user experience.

### Example

A feeds app embeds content from different sources, through iframes. To cap the performance impact of the embedded content, the host application aligns with its producers on guidelines and best practices for the embeddees to be loaded into the experience, requiring the content to be served with an agreed upon subset of policies (categories above).

The host app serves its main document with Document Policy directives to enforce on embedded content. In the most simple case, the app opts in to a single category:<br>
```
Require-Document-Policy: basic
```

But it can opt in to more of them, each through its own Document Policy configuration point:

```
Require-Document-Policy: basic, early-script, globals, script
```

Alternatively, the app can set any policy subset to individual frames:<br>
```
<iframe policy="basic">
<iframe policy="basic, early-script">
```

As a result, requests to embedded content will be sent with [`Sec-Required-Document-Policy` header](https://wicg.github.io/document-policy/#sec-required-document-policy-http-header) matching the top-level document’s requested configuration. Per Document Policy design, embeddees receiving this request header must opt in for their content to be loaded, with the option to specify a reporting endpoint:

```
Document-Policy: basic, early-script, globals, script, *; report-to=endpoint
Reporting-Endpoints: endpoint="https://example.com/reports"
```

### API Design Discussion
#### Using multiple Document Policy configuration points
Document Policy allows for a single value for each configuration point. Since the categories proposed by this solution are independent of each other, this necessitates multiple configuration points.

#### Opt-in and policy negotiation
Document Policy requires that each document opts in to the policies to be applied on a given document. While this is a limitation to amount of control the embedder can have over the embeddee's performance, we consider this behavior as necessary due to the following reasons:

* **Control flow alteration.** Direct enforcement would allow for a document to impose changes to the control flow of unwitting embedded third parties.
* **Potential for side-channel attacks.** See more details in Security and Privacy Considerations.

Despite this limitation, Document Policy allows policy negotiation which would allow the embedder to require the relevant policies in this proposal. Through this mechanism, the embedder can still require conformance from the embedee to be loaded, while keeping the embeddee in charge of its own control flow.

#### Negotiation vs enforcement
Document Policy proposes a mechanism for policy negotiation. An embeddee which doesn’t agree to the embedder’s policies will not be loaded. This document makes a distinction between this _negotiation_ (which might result in an embedee failing to load), and _enforcement_. Enforcement of the policy (what will happen when a violation occurs) is to be defined by each aspect of the proposed configuration points.

#### Open question: required policy and report-only mode
It is unclear from the Document Policy explainer whether a report-only header in an embedded document satisfies the requirements set by [`Sec-Required-Document-Policy` header](https://wicg.github.io/document-policy/#sec-required-document-policy-http-header).


### What should be standardized?

There are various layers of configuration that can happen and we need to ensure alignment on what should be a web standard vs. what is left to browsers to determine. Here is a discussion of what we propose:

| **Layer of configuration** | **Standardize?** | **Notes** |
| -------------------------- | ---------------- | --------- |
| **Different categorizations of features:** Currently there are four and can expand in the future with new categories. | Yes | There needs to be alignment within the web community on what the key factors are that we want to allow restrictions for. This allows site developers to be on the same page and make tradeoffs accordingly. The definition for each category and number of categories need to be standardized. Standardizing this gives site developers an opportunity to optimize their performance regardless of the browser their end users are on. |
| **Mechanism to set restrictions:** How site embedder set constraints. | Yes | Related to the different categories, the mechanism should be the same across browsers so that sites work agnostic of the browser. |
| **Criteria for each category** | Yes | Currently, the criteria for each category is determined from observations and learnings from customer engagements. This may change or evolve with time. This should be standardized so that developers know what the expectations are across all browsers and the web platform. |
| **Limits for each criteria** | Yes | Some of the limits have been determined based on observations, use cases, etc. This should also be browser agnostic so embedee developers know what the expectations are. |
| **Reporting violations** | Yes | Similar to mechanism for setting restrictions, embedder developers should have the same expectations on getting violations across all browsers their site/app runs on. |
| **How violations are handled** | No | Embedder developers should be able to opt into default behavior when restrictions are violated. There is a plethora of things that can happen when restrictions are violated. Different levels of standardization can happen here. The web platform can provide a default option for how violations are handled e.g. standard can be “some UI indicator is shown when violations are made” but it doesn’t have to be a standard what exactly is the UI. |


## Security and Privacy Considerations

### Global budgets and side-channel attacks
The proposed criteria include budgets which are shared globally across documents. This could allow for documents to learn things about cross-origin documents, as described in the [Never Slow Mode explainer](https://github.com/slightlyoff/never_slow_mode?tab=readme-ov-file#global-limits). We consider the same alternatives introduced for NSM as viable for this proposal:
  * Require CORS
  * Fuzzy budgeting

### Frame depth
As called out in the [Never Slow Mode explainer](https://github.com/slightlyoff/never_slow_mode?tab=readme-ov-file#global-limits), a limit greater than 2 would expose the depth in the tree of a document.

## Dependencies on non-stable features
* Document Policy ([explainer](https://wicg.github.io/document-policy/))
  - general: currently, only implemented by Chromium-based browsers.
  - Document Policy negotiation: disabled by default.
  - `policy` attribute: currently unimplemented.

## Alternatives considered

### Custom attributes and headers
We considered a functionally equivalent, more scoped custom mechanism involving HTTP headers and a frame tag attribute, for example:

```
Performance-Control: basic
```

```
<iframe performance-control="basic">
```

However, this approach meant re-defining a solution for a problem already in the scope of Document Policy, with the same challenges still applying: handling of 3rd party violation reports, opt-in requirement and budget-based state leaks.

Furthermore, these challenges arise from the nature of the embedder-embedee relationship where constraints are proposed. Any solution to this problem will need to address them.

### Levels vs. categories
We considered having a single Document Policy configuration point based on “levels” which would compound restrictions on top of each other, but this was discarded due to increased difficulty to introduce new values in the future.

For example, with the "levels" approach, each category would map to a level and be included in the level above:

| Level | Category mapping |
|---|---|
| level 1 | `basic` |
| level 2 | `basic` + `early-script` |
| level 3 | `basic` + `early-script` + `globals` |
| level 4 | `basic` + `early-script` + `globals` + `script` |

With this approach, adding a new group of constraints would only be possible by adding a new level with all previously defined constraints, or by redefining existing levels. We consider this to be an unnecessary limitation.

## Open Issues

### Per-document constraints
Document Policy directives are effective on a per-document basis. This generally makes it harder for constraints to have the desired impact to improve performance, as the overall cap on resources increases with the complexity of the page. We propose capping the overall complexity and resources through frame depth and count restrictions to avoid an unbound upper limit to page resource consumption.

What would be the appropriate frame count and depth limit? See related discussion in [Security and Privacy Considerations](#frame-depth).

### Criteria and category definition, evolution
This proposal provides an affordance for web developers to gain back control over the performance of their web property. A set of performance-impacting criteria was derived from [Never Slow Mode](https://github.com/slightlyoff/never_slow_mode?tab=readme-ov-file#global-limits) and experience in the field (see note in [Proposed Solution](#proposed-solution)). These criteria were then grouped into buckets, taking into account their overall impact, stage in the document lifetime and estimated effort from the developer to fix.

The result is a set of criteria mapped to a smaller set of policies/categories. This mapping is an explicit design choice to remove the burden of determining criteria from individual sites and app developers.

We expect these criteria and their specific limits to evolve with the web, which poses the question of how to best evolve the API. We are considering the following options:

1. **Define once, no changes**
    | **Pros** | **Cons** |
    |---|---|
    | - Web developers can anticipate and address violations.<br>- Consistent behavior after site opts into the policy. | - Criteria fixed to today's recommendations. |

2. **Updating criteria under the same category tags**
    | **Pros** | **Cons** |
    |---|---|
    | - Sites opting in are kept to the latest criteria under each category. | - Sites subject to changing platform behavior.<br>- Actual criteria and limits are fragmented with the web. |

3. **Updated criteria under new category tags**
    | **Pros** | **Cons** |
    |---|---|
    |- Web developers can anticipate and address violations. | - Requires changes from sites each time there's a change in a category. | 

An ideal mechanism would allow for this evolution go happen in a controlled, predictable manner. An open point for discussion is whether it's a reasonable trade off for developers opting in to be expected to keep up with the platform as criteria evolves.

### Reporting 3rd party violations to embedder
Embedders are best equipped to influence change in the performance when they are aware of where the issues are. While Document Policy provides a Reporting API integration, this only reports violations to the endpoint of the document where the violation occurs. Embedders do not receive reports that the embedded content has incurred policy violations, which is a limitation. We are currently considering sending a minimal report to the embedder when a violation occurs in the embedded document.

### Interaction with Heavy Ad Interventions


### Open question: how can we ensure fair restrictions for various types of devices (e.g. low end vs. high end devices)?

### Open question: how to determine categories/criteria/limits for desktop vs. mobile?

## References & acknowledgements

This proposal has been inspired by and builds on the incredible work done in:
* [Never-Slow Mode](https://github.com/slightlyoff/never_slow_mode?tab=readme-ov-file)
* [Document Policy](https://github.com/WICG/document-policy/blob/main/document-policy-explainer.md)
* [Heavy Ad Interventions](https://developer.chrome.com/blog/heavy-ad-interventions)

Many thanks for the valuable feedback and advice from:
* [Limin Zhu](https://github.com/liminzhu)
* [Sam Fortiner](https://github.com/sfortiner)
* [Alison Maher](https://github.com/alisonmaher)
* [Mike Jackson](https://github.com/mwjacksonmsft)
* [Erik Anderson](https://github.com/erik-anderson)


[^1]: https://infrequently.org/2023/02/the-market-for-lemons/
[^2]: https://www.thinkwithgoogle.com/marketing-strategies/app-and-mobile/page-load-time-statistics/
