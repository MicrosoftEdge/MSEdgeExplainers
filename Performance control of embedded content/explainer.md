# Performance control of embedded content

## Authors
- [Nishitha Burman Dey](https://github.com/nishitha-burman)
- [Luis Flores](https://github.com/lflores-ms)
- [Andy Luhrs](https://github.com/aluhrs13)
- [Alex Russell](https://github.com/slightlyoff)

## Introduction
This document proposes platform functionality to give embedders (browsers, websites, hosting applications) the ability to put constraints on resources allocated to embedees (iframes, browsers tabs, WebViews) to minimize the performance impact that embedded web content can have on an user’s device. Additionally, violations of the constraints will be reported to the embedder to inform and improve the ecosystem.  

Embedder developers can do this by enabling various categories of criteria that constrain performance impacting features on the embedee.  

## Goals
With global web usage continuing to rise and more companies relying on the web as a primary platform to deliver their applications, performance has become a critical factor for success. As more users access websites through mobile devices and lower-powered hardware, the need for fast responsive web experiences is non-negotiable[^1],[^2].
When it comes to optimizing performance, websites and apps are limited by the performance of the external content they embed, these can be 3rd party sites, 3rd party apps, and even content from other organizations within a company. As a result, being able to control the performance of embedded content is crucial to improving the overall performance of a site or app.
This proposal has two primary goals:
1.	Improve users’ satisfaction with their OS, browser, and applications via formalizing methods of constraining the resources available to web content.
2.	Provide information to help developers improve the performance of web sites and apps through reporting when performance is negatively impacting end-users and/or applications hosting the site in a frame. 

### Scenarios
* Embedded widgets: Weather forecast, stock tickets, etc.
* Embedded Ads: Embedded ads from networks like Google AdSense or Bing Ads. 
* Embedded calendars: Embedding calendars from services like Outlook Calendar, Google Calendar, etc. 

## Proposed Solution
There are four categories (A, B, C, D) of performance impacting criteria that developers can enforce on embedded content. Based on the scenarios, the app can emable all or one of the categories. 

| **Perf. Category** | **Criteria** | **Handling violations** |
| -------------  | -------- | ------------------- |
| **A: Basic**<br>**Description**: Basic web development best practices that are scenario-agnostic. | **- Text resources must be compressed** (HTML, CSS, JS, JSON).<br> **- Oversized unzipped assets are flagged:**<br>* Assets larger than 100KB embedded via `data:...` URLs.<br>* Image files larger than 500KB served in last generation formats.<br> * Web fonts that are larger than 300KB. | - Reporting violations via Reporting API.<br> - Assets not rendered.<br> UI indicator to block out images that are too large. |
| **B: Early-script**<br>**Description**: JavaScript constraints to enhance performance and minimize impact on user experience before interaction begins. | **- JS limits:**<br>* Total limits on JS served prior to user interaction: 2MB<br>* Scripts must contain `content-length` headers<br>* No non-compositor thread animations (e.g. animated SVGs, loading spinners, etc.). | - Report violations via Reporting API.<br> - Loading of scripts that violate the limit are paused/blocked.<br> - Pause/disconnect animations that are not visible, interacted with. |
| **C: Globals**<br>**Description:** Overall media and system resource usage constraints. | **- Cumulative resource consumption limits per interaction:**<br>* Caps on total media usage. No more than a total of X.<br>* Limits on iframe count. No more than a total of 10.<br>* Limits of iframe depth. No mroe than a depth of 10.<br>* CPU usage before first interaction: XMB. | - Report violations via Reporting API.<br>- Do not load media at all. <br>- Do not load iframes that surpass the depth. |
| **D: Script**<br>**Description:** Strict JavaScript restrictions. | **-Additional JS limits:**<br>* Long tasks in the main thread.<br>* High CPU usage.<br>* Workers with long tasks that exceed Xms.<br> | - Report violations via Reporting API.<br>- Stopping JavaScript if [in the background]. |

### Discussion of different categories
**A: Basic – Basic web development best practices that are scenario-agnostic:** This category covers fundamental web development best practices to ensure that websites are optimized for performance across all environments. This includes compressing text resources such as HTML, CSS JavaScript, and JSON to reduce load times and bandwidth usage, and compressing assets larger than 100KB that are embedded via `data: URLs` as they can slow down page rendering and increase resource consumption. Additionally, images should be served in modern, efficient formats, with any image files exceeding 500KB considered oversized and requiring optimization. Web fonts must also be kept under 300KB to avoid unnecessarily delaying page rendering. 

**B: Early-script – JavaScript constraints to enhance performance and minimize impact on user experience before interaction begins:** This category focuses on JavaScript development best practices that can be done to minimize performance issues before user interaction begins. This includes capping JavaScript resources loaded initially to avoid overwhelming devices with limited processing power or bandwidth, and serving JavaScript with constrained content-length headers to ensure predictable resource delivery and prevent bloated downloads. Additionally, animations that don’t run on the compositor thread should be avoided, as they can trigger costly layout recalculations and choppy user experiences, especially during page load or scroll events. 

**C: Globals – Overall media and system resource usage constraints:** This category entails imposing limits on overall media and system resource usage during interactions to help prevent websites from over-consuming resources and degrading user experiences. This includes capping total media usage and iframe count/nesting to avoid excessive memory consumption and rendering issues because it can slow down the page and make it unresponsive, particularly on lower-end devices or in resource-constrained environments.  

**D: Script – Strict JavaScript restrictions:** This category enforces restrictions on more complex JavaScript to further enhance performance. This includes limiting long tasks running on the main thread as they block the event loop and degrade interactivity leading to slow response times, and capping high CPU usage tasks, particularly those involving workers that exceed certain execution times, to ensure they don’t monopolize system resources. These restrictions ensure that JavaScript execution remains lightweight and efficient, preventing detrimental performance impacts on the user experience.  

## What should be standardized?
| **Layer of configuration** | **Standardize?** | **Notes** |
| -------------------------- | ---------------- | --------- |
| **Different categorizations of features:** Currently there are four and can expand in the future with new categories. | Yes | There needs to be alignment within the web community on what the key factors are that we want to allow restrictions for. This allows site developers to be on the same page and make tradeoffs accordingly. The definition for each category and number of categories need to be standardized. Standardizing this gives site developers an opportunity to optimize their performance regardless of the browser their end users are on. |
| **Mechanism to set restrictions:** How site embedder set constraints. | Yes | Related to the different categories, the mechanism should be the same across browsers so that sites work agnostic of the browser. |
| **Criteria for each category** | Yes | Currently, the criteria for each category is determined from observations and learnings from customer engagements. This may change or evolve with time. This should be standardized so that developers know what the expectations are across all browsers and the web platform. |
| **Limits for each criteria** | Yes | Some of the limits have been determined based on observations, use cases, etc. This should also be browser agnostic so embedee developers know what the expectations are. |
| **Reporting violations** | Yes | Similar to mechanism for setting restrictions, embedder developers should have the same expectations on getting violations across all browsers their site/app runs on. |
| **How violations are handled** | No | Embedder developers should be able to opt into default behavior when restrictions are violated. There is a plethora of things that can happen when restrictions are violated. Different levels of standardization can happen here. The web platform can provide a default option for how violations are handled e.g. standard can be “some UI indicator is shown when violations are made” but it doesn’t have to be a standard what exactly is the UI. |

## Non-goals
The key factor of this solution is there are categories of focused, perf impacting features that developers can choose to enforce restrictions on their apps. The threshold and limits and specific criteria within a category may evolve over time and is determined by the platform. **The developer will not have control over granular values of each limit or individual criteria within a category. This is determined by the platform.**

## Proposed API Solution
Introduce [Document Policy](https://github.com/WICG/document-policy/blob/main/document-policy-explainer.md) configuration points (see discussion section), one for each of the categories above:
A: Basic
B: Early-script
C: Globals
D: Script

**Note:** Names here are only monikers and expected to change in public explainer.

This enables each document to:
* Self-impose performance constraints.
* Negotiate constraints (see discussion section) for each subresource.

**Example**
A feeds app embeds content from different sources, through iframes. To cap the performance impact of the embedded content, the host application aligns with its producers on guidelines and best practices for the embeddees to be loaded into the experience, requiring the content to be served with an agreed upon subset of policies (categories above). 
The host app serves its main document with Document Policy directives to enforce on embedded content:<br>
`Require-Document-Policy: basic, early-script, globals, script`

Alternatively, the app can set any policy subset to individual frames:<br>
`<iframe policy=”basic”>`<br>
`<iframe policy=”basic, early-script”>`<br>

As a result, requests to embedded content will be sent with Sec-Required-Document-Policy header matching the top-level document’s requested configuration. Per Document Policy design, embeddees receiving this request header must opt in for their content to be loaded, with the option to specify a reporting endpoint:
`Document-Policy: basic, early-script, globals, script, *; report-to=endpoint`<br>
`Reporting-Endpoints: endpoint="https://example.com/reports"`

### Discussion
#### Document Policy - configuration points
Document Policy allows for a single value for each configuration point. Since the categories proposed by this solution are independent of each other, this necessitates multiple configuration points.

#### Policy negotiation and enforcement
\<why opt in necessary>

* \<side channel attacks> - See NSM
* \<unexpected behavior can break site>

\<policy opt-in, policy enforcement>

 Document Policy establish a mechanism for agreement of embedder and embedee about the policies to be applied. An embeddee which doesn’t agree to the embedder’s policies will not be loaded. However, this is only an agreement from the parties involved. Actual enforcement of the policy is to be defined by such policy.

#### \<per document constraints>
\<constraints are applied at document level, setting a required policy requires the same policy for each document on its own, not as part of a global budget/constraint. Best way to cap total resources/complexity is likely through frame depth restriction> 

### Open questions


### Alternatives considered

[^1]: https://infrequently.org/2023/02/the-market-for-lemons/
[^2]: https://www.thinkwithgoogle.com/marketing-strategies/app-and-mobile/page-load-time-statistics/
