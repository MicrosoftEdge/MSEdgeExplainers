# Network Efficiency Guardrails API

**Authors:** [Luis Flores](https://github.com/lflores-ms), [Victor Huang](https://github.com/victorhuangwq)

Network Efficiency Guardrails defines a [Document Policy](https://wicg.github.io/document-policy/) configuration that allows documents to adopt User Agent‑defined constraints on network resource usage, such as large uncompressed resources.

```
Document-Policy: network-efficiency-guardrails
```

When the policy is active, the User Agent monitors resource requests initiated by the document and triggers violations when inefficient network usage occurs. Violations are reported via the Reporting API and handled according to the policy's enforcement rules.

```
DocumentPolicyViolationReportBody {
  featureId: "network-efficiency-guardrails",
  ...
  sourceFile: "https://www.example.com/uncompressed_resource",
  message: "Document policy violation: resource compression is required"
}
```

This allows applications to become aware of inefficient network behavior which impacts performance, surfacing issues and opportunities to improve the user experience.

## Participate
<a href="https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Network%20Efficiency%20Guardrails">![GitHub issues by-label](https://img.shields.io/github/issues/MicrosoftEdge/MSEdgeExplainers/Network%20Efficiency%20Guardrails?label=issues)</a>

[Open an issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?template=performance-control-of-embedded-content.md)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Network Efficiency Guardrails API](#network-efficiency-guardrails-api)
  - [Participate](#participate)
  - [Motivation](#motivation)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
  - [Proposed API: `network-efficiency-guardrails`](#proposed-api-network-efficiency-guardrails)
    - [Example](#example)
    - [Threshold design considerations](#threshold-design-considerations)
    - [Violation reporting](#violation-reporting)
    - [Policy enforcement](#policy-enforcement)
    - [Future considerations: cross-document reporting](#future-considerations-cross-document-reporting)
  - [Alternatives considered](#alternatives-considered)
    - [Relying on existing performance measurement APIs](#relying-on-existing-performance-measurement-apis)
    - [Custom attributes and headers](#custom-attributes-and-headers)
    - [One policy per criterion](#one-policy-per-criterion)
  - [Security and Privacy Considerations](#security-and-privacy-considerations)
    - [Document and frame boundaries](#document-and-frame-boundaries)
    - [Cross-origin resource exposure](#cross-origin-resource-exposure)
  - [References & acknowledgements](#references--acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Motivation

Inefficient network resource usage (such as loading large, uncompressed assets) can have a direct and measurable impact on page performance, data usage, and user experience. While existing platform APIs expose detailed network activity for these loads, they largely operate at a measurement level. For example, APIs such as [Resource Timing](https://www.w3.org/TR/resource-timing/) provide granular information about individual requests, but they do not identify whether a resource load represents inefficient network usage with meaningful performance impact. These issues are often difficult for developers to detect and diagnose, as the performance cost of individual resource loads may not be obvious during development or code review. As a result, developers must infer inefficiency post‑hoc through analysis, heuristics, or manual inspection. Attribution and remediation are therefore difficult, especially as inefficient behavior may only surface under specific device, network, or content conditions.

Network Efficiency Guardrails addresses this gap by defining a policy that makes inefficient network behavior observable to the User Agent as it occurs. The policy serves as a mechanism for the User Agent to identify and surface conditions with real performance impact as a well‑defined signal. By integrating with the [Reporting API](https://www.w3.org/TR/reporting-1/), it enables documents to become aware of these conditions and supports tooling and reporting workflows (present and future) to respond in a consistent and extensible way.

Embedding scenarios are a primary motivation for this work, as inefficient network usage within cross‑origin embedded content is especially difficult for hosting documents to observe or attribute. While expanding the visibility of reports across document boundaries would further amplify the value of this signal in the direction established by [Performance Control of Embedded Content](PerformanceControlOfEmbeddedContent/explainer.md), cross‑document reporting mechanisms are out of scope for this proposal since reporting is defined by the Document Policy mechanism itself. This topic is discussed in [Future considerations: cross‑document reporting](#future-considerations-cross-document-reporting).

## Goals

* Allow developers to monitor performance‑relevant network behavior without defining custom heuristics or thresholds.
* Surface resource usage instances that are likely to materially affect page performance.
* Use hardware‑agnostic criteria that apply consistently across device classes and network conditions.

## Non-goals
* Provide fine‑grained control over network resource loading.
* Expose detailed timing or low‑level performance metrics.
* Introduce cross-document reporting mechanisms.

## Proposed API: `network-efficiency-guardrails`

This proposal introduces a [Document Policy](https://wicg.github.io/document-policy/) [configuration point](https://wicg.github.io/document-policy#configuration-point) of boolean type (default value `false`) with the name `network-efficiency-guardrails`, which allows a document to opt into User Agent monitoring of network resource usage patterns with real performance impact.

When the policy is active, the User Agent monitors network resource requests initiated by the document through its HTTP(S) resource loading pipeline that result in actual network transfer, and identifies inefficient usage according to a set of scenario‑agnostic criteria. These criteria are intended to be hardware‑agnostic, independent of transient network conditions, and stable enough to support consistent interpretation across implementations.

Specifically, the User Agent flags the following conditions as policy violations:

1. **Text-based resources served without HTTP compression**
  Text‑based resources such as HTML, CSS, JavaScript, and JSON are expected to be delivered using HTTP‑based compression.

2. **Uncompressed file formats when compressed alternatives are available**
  Non‑text resources are expected to use compressed formats when such formats are supported and available. For example, using `.ttf` fonts instead of `.woff`.

3. **Resources with excesive total size**
  To limit disproportionate network cost, size thresholds apply to the following resources and non‑network resource embeddings:

    * data: URLs larger than 100 kB
    * Image files larger than 200 kB
    * Web fonts larger than 96 kB

The policy is intentionally scoped to runtime observability of network behavior, rather than fine‑grained resource control. As a result, only resource fetches that result in network activity are evaluated; resources satisfied entirely from local caches (for example, memory cache or HTTP cache hits that do not revalidate) do not trigger evaluation or reporting.

Violations are reported through [Document Policy](https://wicg.github.io/document-policy/)’s integration with the [Reporting API](https://www.w3.org/TR/reporting-1/). When enforcement is enabled, resources triggering violations are blocked by the User Agent and the corresponding assets are not rendered.

### Example

A web application relies on several third‑party libraries and allows users to upload and display content. To better understand the real-world performance of the application and its dependencies, the document opts into `network-efficiency-guardrails`.

```
HTTP/1.1 200 OK
Content-Type: text/html
...
Document-Policy: network-efficiency-guardrails; report-to=endpoint
Reporting-Endpoints: endpoint="https://example.com/reports"
...
```

A large 2MB image is served in the document. When the size limit violation is detected, the User Agent generates a report. The report is delivered via the Reporting API, allowing the document to observe the inefficient network usage and attribute it to the corresponding resource.

### Threshold design considerations

This proposal operates as an opt‑in policy, intended for performance‑conscious deployments. Because adoption is explicit, the policy leans towards more stringent limits.

To ensure consistent behavior across implementations, thresholds are defined by the API, rather than the User Agent, and are chosen to identify resource usage patterns that are broadly atypical of well‑performing sites, rather than to express device‑specific capacity constraints or optimal values for all contexts. This allows developers and tooling to rely on stable, predictable signals, particularly in configurations where resources may be blocked as a result of policy violations. A similar approach has been taken by [Heavy Ad Interventions](https://developer.chrome.com/docs/web-platform/heavy-ads-intervention), where fixed thresholds are used to ensure consistent behavior, even though that mechanism is not exposed as a Web Platform API.

Criteria and threshold values are informed by available aggregate datasets and established industry best practices. Where comparable data is not available, limits reflect observed usage patterns across real‑world sites that are known to have disproportionate performance impact.

For example, image and font size thresholds are based on [Web Almanac data](https://almanac.httparchive.org/en/2024/media#byte-sizes), using p90 distributions to identify resource sizes that are atypical for well‑performing sites. For `data:` URLs, where web‑wide datasets are less readily available, informal industry guidance and performance best practices have been adopted to set an initial threshold of 100 kB as a deliberately generous upper bound compared to the industry recommendation of only a few kilobytes. Thresholds can be refined as additional data and deployment experience become available.

All thresholds are designed to be platform‑agnostic and stable over time, avoiding dependence on device class or transient network conditions.

### Violation reporting
Network Efficiency Guardrails integrates with [Document Policy](https://wicg.github.io/document-policy/)’s reporting mechanism to surface violations of the policy’s criteria. When a violation is detected, the User Agent generates a report that can be observed through established [Reporting API](https://www.w3.org/TR/reporting-1/) mechanisms.

Violation reports generated by this policy expose limited, policy‑level information, sufficient to identify and diagnose inefficient network usage without revealing fine‑grained resource metrics, using the following format:

```
DocumentPolicyViolationReportBody {
  featureId: "network-efficiency-guardrails",
  disposition: <disposition>,
  sourceFile: <resource-url>,
  lineNumber: null,
  columnNumber: null,
  message: <description>
}
```

Where `resource-url` represents the URL of the network resource that triggered the violation (or the containing resource for `data:` URLs), and `description` is a human-redable description of the violated criterion. The structure of this report type is [defined by Document Policy](https://wicg.github.io/document-policy/#is-value-compatible-or-report) ([related issue](https://github.com/w3c/reporting/issues/216)), with `disposition` being "enforce" or "report", according to Document Policy definitions.

As with other Document Policy features, `network-efficiency-guardrails` may be deployed in reporting‑only mode, allowing sites to observe violations and evaluate the policy's impact before opting into enforcement.

### Policy enforcement

When enforcement is enabled for `network-efficiency-guardrails`, resource requests that violate the policy criteria are blocked by the User Agent, and the corresponding assets are not rendered.

Enforcement builds on the same violation detection and reporting model described above. For this reason, it is expected that sites would deploy the policy in reporting‑only mode first, using the resulting reports to evaluate impact before enabling enforcement.

### Future considerations: cross-document reporting

While we believe the proposed policy is useful and complete as defined in this document, enabling controlled reporting across document boundaries would further amplify the value of this signal in embedded scenarios. In many real‑world cases, inefficient resource usage originates in a nested document, while the resulting performance impact is primarily experienced by the embedding document. Allowing embedders to receive policy violation information would enable more effective diagnosis and remediation of such issues.

One possible approach is to introduce cross‑document reporting negotiation as part of Document Policy itself. Under such a model, an embedding document could request cross‑document reporting via an explicit opt‑in signal (for example, a `Require-Document-Policy-Reporting` header), with embedded documents allowed to agree and provide full reports or decline and instead expose a reduced signal, similar to opaque responses or restricted timing properties in ResourceTiming API.

This negotiation would need to be generically defined by Document Policy as an infrastructure capability, rather than by individual policies. Cross‑document reporting is therefore not specified as part of this proposal, but remains a future goal.

## Alternatives considered

### Relying on existing performance measurement APIs

Existing platform APIs such as [Resource Timing](https://www.w3.org/TR/resource-timing/) expose detailed request‑level metrics, including timing and transfer size. However, these APIs operate at a measurement level and require developers to derive their own heuristics to identify inefficient behavior. In practice, this often involves ad‑hoc thresholds, device‑specific assumptions, or post‑hoc analysis.

### Custom attributes and headers

Earlier iterations of this work considered a more narrowly scoped mechanism based on custom HTTP headers and embedding‑specific attributes, for example:

```
Performance-Control: basic
```

```
<iframe performance-control="basic">
```

This approach was primarily motivated by embedding scenarios and proposed a separate signaling mechanism between embedders and embedded documents. While an embedding-agnostic variant could also be designed using document‑scoped mechanisms such as a `<meta>` tag, neither approach would provide functionality beyond what is already in the scope of [Document Policy](https://wicg.github.io/document-policy/). As a result, introducing a parallel, embedding‑specific or policy‑specific mechanism would replicate parts of Document Policy and add complexity without materially improving the design.

### One policy per criterion
Another alternative was to expose separate policies for each individual criterion (for example, one policy for compression, one for image size limits, and so on).

This approach places the burden on developers to determine which criteria to enable, and to reason about appropriate combinations, heuristics, and thresholds. In practice, this would reintroduce the same fragmentation and ad‑hoc decision‑making that this proposal aims to avoid. Instead, Network Efficiency Guardrails groups related criteria into a single, coherent policy. This provides a consistent, interpretable signal for inefficient network usage, while avoiding the need for developers to assemble their own performance heuristics.

## Security and Privacy Considerations

### Document and frame boundaries

Network Efficiency Guardrails is a document‑scoped policy. Monitoring, classification, and reporting are limited to documents that explicitly opt into the policy. Violation reports are delivered only to the document in which the violating resource is loaded, and its registered reporting endpoints.

This proposal does not introduce cross‑document propagation mechanisms. Visibility across document boundaries, such as forwarding reports from embedded documents to an embedding document, requires explicit cooperation and is out of scope for this proposal.

Embedding scenarios follow the [Document Policy](https://wicg.github.io/document-policy/) model, where requested constraints cannot be unilaterally imposed across frames. When applied to embedded content, policy adoption requires acknowledgment by the embedded document, preserving existing boundaries and preventing silent enforcement on third‑party content.

### Cross-origin resource exposure

When enabled, Network Efficiency Guardrails applies to all network resources loaded by the document, including cross‑origin subresources. As a result, the policy may surface information about cross‑origin resources in a structured form. This exposure is a deliberate trade‑off to enable diagnosability of network inefficiencies with real performance impact.

Specifically, violation reports may expose the **full URL** of a violating resource together with a categorical classification derived from qualitative or quantitative resource properties, such as:

- Use of HTTP compression
- Use of compressed file formats
- Size-based thresholds (including images and fonts)

The full URL may include user‑provided components (for example, path segments or query parameters) supplied by the embedding document or the resource initiator. However, this information is not fundamentally new: documents can already observe resource URLs through existing mechanisms such as script‑level instrumentation (for example, monkey‑patching fetch or element constructors) and Service Workers, which are able to intercept and inspect requests initiated by controlled documents, including cross‑origin subresource requests.

The exposed signal is intentionally coarse and non‑parametric. Reports identify that a browser‑defined threshold has been exceeded, but do not disclose exact resource sizes or other fine‑grained measurements. Threshold values are defined by the policy and are not attacker‑controlled, limiting the usefulness of the signal for probing or fingerprinting.

The following factors constrain the privacy impact of this exposure:

- The signal is generated only as a result of explicit opt‑in by the document.
- The classification is threshold‑based and does not allow parameterized probing.
- No persistence, cross‑document correlation, or direct user‑specific state is exposed.

Further mitigation strategies may be considered, such as gating reports on explicit resource opt‑in (for example, via `Timing-Allow-Origin` or an equivalent mechanism), but such approaches are not currently required by the proposal and remain an area for future exploration.

## References & acknowledgements

This proposal builds on [Performance Control of Embedded Content](PerformanceControlOfEmbeddedContent/explainer.md), which explored performance constraints and observability for web content. Its evolution has been informed by discussion in the W3C Web Performance Working Group, as well as prior work including:

* [Never-Slow Mode](https://github.com/slightlyoff/never_slow_mode?tab=readme-ov-file)
* [Document Policy](https://github.com/WICG/document-policy/blob/main/document-policy-explainer.md)
* [Heavy Ad Interventions](https://developer.chrome.com/blog/heavy-ad-interventions)

Many thanks for the valuable feedback and guidance offered during earlier iterations of this work, including:

* [Limin Zhu](https://github.com/liminzhu)
* [Sam Fortiner](https://github.com/sfortiner)
* [Alison Maher](https://github.com/alisonmaher)
* [Mike Jackson](https://github.com/mwjacksonmsft)
* [Erik Anderson](https://github.com/erik-anderson)

And to the contributors and reviewers who helped shape the `network-efficiency-guardrails` proposal in its current form:

* [Yoav Weiss](https://github.com/yoavweiss)
* [Fabio Rocha](https://github.com/fabiorocha)
