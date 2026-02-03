# Network Efficiency Guardrails API

Network Efficiency Guardrails defines a Document Policy configuration that allows documents to adopt user agent‑defined constraints on network resource usage, such as large uncompressed resources. When the policy is active, the user agent monitors resource requests initiated by that document and triggers violations when inefficient network usage occurs. Violations are reported via the Reporting API and handled according to the policy's enforcement rules.

This allows applications to become aware of inefficient network behavior which impacts performance, surfacing issues and opportunities to improve the user experience.

## Motivation

Inefficient network resource usage --such as loading large, uncompressed assets-- can have a direct and measurable impact on page performance, data usage, and user experience. While existing platform APIs expose detailed network activity for these loads, they largely operate at a measurement level. For example, APIs such as Resource Timing provide granular information about individual requests, but they do not identify whether a resource load represents inefficient network usage with meaningful performance impact. These issues are often difficult for developers to detect and diagnose, as the performance cost of individual resource loads may not be obvious during development or code review. As a result, developers must infer inefficiency post‑hoc through analysis, heuristics, or manual inspection. Attribution and remediation are therefore difficult, especially as inefficient behavior may only surface under specific device, network, or content conditions.

Network Efficiency Guardrails addresses this gap by defining a policy that makes inefficient network behavior observable to the user agent as it occurs. The policy serves as a mechanism for the user agent to identify and surface conditions with real performance impact as a well‑defined signal. By integrating with the Reporting API, it enables documents to become aware of these conditions and supports tooling and reporting workflows--present and future--to respond in a consistent and extensible way.

Embedding scenarios are a primary motivation for this work, as inefficient network usage within cross‑origin embedded content is especially difficult for hosting documents to observe or attribute. Expanding the visibility of reports created by this policy across document boundaries would further amplify the value of this signal in the direction established in <proposal> and remains a future goal. However, such reporting mechanisms are out of scope for this proposal.

## Goals

* Allow developers to monitor performance‑relevant network behavior without defining custom heuristics or thresholds.
* Surface resource usage instances that are likely to materially affect page performance.
* Use hardware‑agnostic criteria that apply consistently across device classes and network conditions.

## Non-goals
* Provide fine‑grained control over network resource loading.
* Expose detailed timing or low‑level performance metrics.

## Proposed API: `network-efficiency-guardrails`

This proposal introduces a configuration point in Document Policy `network-efficiency-guardrails`, that allows a document to opt into user agent monitoring of network resource usage patterns with real performance impact.

When the policy is active, the user agent monitors network resource requests initiated by the document that result in actual network transfer, and identifies inefficient usage according to a set of scenario‑agnostic criteria. These criteria are intended to be hardware‑agnostic, independent of transient network conditions, and stable enough to support consistent interpretation across implementations.

Specifically, the user agent flags the following conditions as policy violations:

1. **Text-based resources served without HTTP compression**
Text‑based resources such as HTML, CSS, JavaScript, and JSON are expected to be delivered using HTTP‑based compression.

2. **Uncompressed file formats when compressed alternatives are available**
Non‑text resources are expected to use compressed formats when such formats are supported and available.

3. **Resources with excesive total size**
To limit disproportionate network cost, the following size thresholds apply to resources that are not HTTP‑compressed:

  * data: URLs larger than 100 kB
  * Image files larger than 200 kB
  * Web fonts larger than 96 kB

The policy is intentionally scoped to runtime observability of network behavior, rather than fine‑grained resource control. Violations are reported through Document Policy’s integration with the Reporting API. When enforcement is enabled, resources triggering violations are blocked by the user agent and the corresponding assets are not rendered.

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

A large 2MB image is served in the document. When the size limit violation is detected, the user agent generates a report . The report is delivered via the Reporting API, allowing the document to observe the inefficient network usage and attribute it to the corresponding resource.

### Threshold design considerations

This proposal operates as an opt‑in policy, intended for performance‑conscious deployments. Because adoption is explicit, the policy can apply more stringent limits than mechanisms that intervene unilaterally. Thresholds are defined by the API, rather than being left to individual user agent discretion. This is to ensure consistent behavior across implementations and allows developers and tooling to rely on stable, predictable signals.

The criteria and limit values are informed by field experience and evaluation across a large number of real‑world sites, drawing on available aggregate data and established industry best practices. Where empirical distributions are available, reference percentiles have been used to guide the choice of limits. Where they are not, limits reflect observed usage patterns that are known to have disproportionate performance impact. All thresholds are designed to be platform‑agnostic, avoiding dependence on device class or transient network conditions.

### Violation reporting
Network Efficiency Guardrails integrates with Document Policy’s reporting mechanism to surface violations of the policy’s criteria. When a violation is detected, the user agent generates a report that can be observed through established Reporting API mechanisms.

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

Where `resource-url` represents the URL of the network resource that triggered the violation, and `description` is a human-redable description of the violated criterion.

### Policy enforcement

When enforcement is enabled for network-efficiency-guardrails, resource requests that violate the policy criteria are blocked by the user agent, and the corresponding assets are not rendered.

Enforcement builds on the same violation detection and reporting model described above. For this reason, it is expected that enforcement would be deployed only after evaluation using reporting‑only mode, to avoid unintended impact on document behavior.

## Alternatives considered

### Relying on existing performance measurement APIs

Existing platform APIs such as Resource Timing expose detailed request‑level metrics, including timing and transfer size. However, these APIs operate at a measurement level and require developers to derive their own heuristics to identify inefficient behavior. In practice, this often involves ad‑hoc thresholds, device‑specific assumptions, or post‑hoc analysis.

### Custom attributes and headers

Earlier iterations of this work considered a more narrowly scoped mechanism based on custom HTTP headers and embedding‑specific attributes, for example:

```
Performance-Control: basic
```

```
<iframe performance-control="basic">
```

This approach was primarily motivated by embedding scenarios and proposed a separate signaling mechanism between embedders and embedded documents. While an embedding-agnostic variant could also be designed using document‑scoped mechanisms such as a `<meta>` tag, neither approach would provide functionality beyond what is already in the scope of Document Policy. As a result, introducing a parallel, embedding‑specific or policy‑specific mechanism would replicate parts of Document Policy and add complexity without materially improving the design.

### One policy per criterion
Another alternative was to expose separate policies for each individual criterion (for example, one policy for compression, one for image size limits, and so on).

This approach places the burden on developers to determine which criteria to enable, and to reason about appropriate combinations, heuristics, and thresholds. In practice, this would reintroduce the same fragmentation and ad‑hoc decision‑making that this proposal aims to avoid. Instead, Network Efficiency Guardrails groups related criteria into a single, coherent policy. This provides a consistent, interpretable signal for inefficient network usage, while avoiding the need for developers to assemble their own performance heuristics.

## Security and Privacy Considerations

## Document and frame boundaries

Network Efficiency Guardrails is a document‑scoped policy. Monitoring, classification, and reporting are limited to documents that explicitly opt into the policy. Violation reports are delivered only to the document in which the violating resource is loaded, and its registered reporting endpoints.

This proposal does not introduce cross‑document propagation mechanisms. Visibility across document boundaries --such as forwarding reports from embedded documents to an embedding document-- requires explicit cooperation and is out of scope for this proposal.

Embedding scenarios follow the Document Policy model, where requested constraints cannot be unilaterally imposed across frames. When applied to embedded content, policy adoption requires acknowledgment by the embedded document, preserving existing boundaries and preventing silent enforcement on third‑party content.

## Cross-origin resource exposure

When enabled, Network Efficiency Guardrails applies to all network resources loaded by the document, including cross‑origin subresources. As a result, the policy may surface information about cross‑origin resources that was not previously available in structured form to the embedding document. This exposure is a deliberate trade‑off to enable diagnosability of network inefficiencies with real performance impact.

Specifically, violation reports may expose the URL of a violating resource together with a categorical classification derived from qualitative or quantitative resource properties, such as:

- Use of HTTP compression
- Use of compressed file formats
- Size-based thresholds (including images and fonts)

The exposed signal is intentionally coarse and non‑parametric. Reports identify that a browser‑defined threshold has been exceeded, but do not disclose exact resource sizes or other fine‑grained measurements. Threshold values are defined by the policy and are not attacker‑controlled, limiting the usefulness of the signal for probing or fingerprinting.

The following factors constrain the privacy impact of this exposure:

- The signal is generated only as a result of explicit opt‑in by the document.
- The classification is threshold‑based and does not allow parameterized probing.
- No persistence, cross‑document correlation, or direct user‑specific state is exposed.

Further mitigation strategies may be considered, such as gating certain classifications on explicit resource opt‑in (for example, via `Timing-Allow-Origin` or an equivalent mechanism), but such approaches are not currently required by the proposal and remain an area for future exploration.
