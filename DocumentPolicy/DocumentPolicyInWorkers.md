# Document Policy in Workers

## Authors:  

- [Monica Chintala](https://github.com/monica-ch) - Engineer at Microsoft Edge
- [Victor Huang](https://github.com/victorhuangwq) - Product Manager at Microsoft Edge

## Participate
- [How does document policy work in workers?](https://github.com/WICG/js-self-profiling/issues/33)

## Introduction

Modern web applications increasingly rely on Web Workers to offload computation from the main thread and maintain UI responsiveness. However, certain web platform feature, such as the JavaScript [js-self-profiling API](https://wicg.github.io/js-self-profiling/), are currently gated by [Document Policy](https://github.com/WICG/document-policy/blob/main/document-policy-explainer.md) and therefore unavailable inside workers.

This limitation prevents developers from gaining fine-grained CPU attribution and performance visibility within worker execution contexts, even when the top-level document has explicitly opted into the relevant policy.

To enable consistent and secure feature gating across browsing and worker contexts, this proposal extends Document Policy to workers by using the worker script's HTTP response headers for network workers, while local scheme workers (blob:, data:) inherit from their creator document.

## Motivation

Applications such as Outlook and other large web clients routinely delegate performance-critical operations (e.g., parsing, computation, data processing) to workers. While the JS Self-Profiling API provides low-overhead sampling of JS stacks on the main thread, developers currently lack any equivalent visibility in workers.

Existing worker performance APIs, such as UserTiming, PerformanceObserver, and PerformanceResourceTiming reveal when tasks are slow, but not why. They cannot attribute CPU cost to specific JS stacks or identify blocking patterns inside the worker event loop.

Because the Self-Profiling API requires an explicit Document-Policy: js-profiling opt-in and Document Policy semantics are undefined for workers, feature exposure is currently blocked. As a result:

- Profiling within workers is impossible, even when a site has safely opted in at the document level.
- Developers must rely on less accurate instrumentation or host-specific debugging (e.g., DevTools CDP sessions).

Extending the Document Policy into workers resolves these gaps, ensures consistent enforcement semantics, and unlocks use of the Self-JS-Profiling API for worker contexts without adding new policies or API surfaces.

## Goals

- Define how Document Policy applies to all worker types (Dedicated, Shared, and Service Workers)
- Enable policy-gated features (like js-self-profiling) to work in workers when appropriately configured
- Clone Document Policy using the same rules as policy container cloning defined in the HTML spec

## Non-Goals

- This proposal doesn’t add new worker configuration APIs or redefine existing Document Policy semantics.
- It also keeps Document Policy support in workers simple by avoiding any merge semantics or intersection rules across different policy features, and does not extend inheritance beyond local (blob:, data:) schemes.

## Use Cases
 - Web performance analysis: Enables JS Self-Profiling in workers to capture CPU stacks during background computation.
 - Large-scale apps using workers: Allow frameworks that offload data processing or rendering to workers to apply consistent profiling.

## Proposed solution: Use Document Policy response headers as authoritative, inherit only for local schemes

We propose workers derive their Document Policy from the worker script’s HTTP response. For local URLs (blob:, data:), the worker inherits the policy from the creating environment.

**For network-loaded workers**: The worker's effective Document-Policy is taken only from the worker script's HTTP response, any creator policy is ignored (no merge/intersection). If the response lacks a Document-Policy header, the feature falls back to its spec-defined default (for js-profiling, typically off).

### Semantics by Worker Type

**Dedicated Workers:**
- For network scripts: Parse `Document-Policy` from the worker script's HTTP response headers
- If no `Document-Policy` header is present: Each feature uses its spec-defined default value (same as document contexts)
- For local schemes (blob:, data:): Worker clones the creator's Document Policy, since no HTTP response exists to consult (blob: URLs clone from the environment that created the blob, data: URLs clone from the document that created the worker)

**Shared Workers:**
- For network scripts: Document Policy is established from the worker script's HTTP response headers when the worker is first created
- When multiple documents attach to the same worker:
  - The shared worker's policy remains fixed based on the script response, regardless of which document initiated the creation
  - Documents can connect to the worker regardless of their own Document Policy settings
- For local schemes: Behavior mirrors dedicated workers, clone from the creator's policy

**Service Workers:**
- The SW registration script response is the authoritative source of Document Policy
- Since Service Workers can start independently of any document, they do not inherit policy from any creator
- Policy remains consistent across all clients controlled by the service worker

**Network Worker with Document-Policy Header:**

HTTP Response for worker script:
```http
Document-Policy: js-profiling
```
Having this header in the script response enables Document-Policy in the worker, allowing developers to use features that the policy supports.

**Using Profiler in Worker:**

If Document-Policy is enabled in the worker, developers can use the Profiler:
```js
// Start a profiling session 
const profiler = new Profiler({ sampleInterval: 10, maxBufferSize: 10_000 }); 
doWork(); 
const trace = await profiler.stop(); 
console.log(JSON.stringify(trace));  
```

### Rationale: Why Response Headers for Network Workers?

If we allowed inheritance for all workers, including network workers, the creator's policy could be applied to scripts from other origins. This would create owner-dependent behavior where the same worker script behaves differently depending on which document started it. 

Since worker scripts are standalone HTTP resources that can define their own headers, including `Document-Policy`, inheriting the document's policy would override what the script's origin intended.

The response-driven model avoids this ambiguity. Each origin controls its own feature gating through headers, future policies stay scoped to the resource that declares them, and sites that can configure document headers can almost always configure worker script headers as well.

Inheritance is therefore limited to local schemes (blob:, data:), which have no HTTP response to carry headers. This approach:
- Aligns with Document Policy's header-based model
- Consistent with other policies that [policy container](https://html.spec.whatwg.org/#initialize-worker-policy-container) model defines in the HTML spec.
- Prevents cross-origin policy leakage
- Ensures consistent, predictable behavior

## Considered Alternatives

### Alternative 1: Inherit Document Policy from Creator

In this approach, workers directly inherit the `Document-Policy` of their creating document for both local schemes and network workers.

**Semantics:**
- **Dedicated Worker**: Inherits the creator document's effective Document Policy
- **Shared Worker**: The first creator's policy applies, later attachers must match or are ignored
- **Service Worker**: Policy is obtained from the Service Worker script's response headers

**Pros:**
- Avoids per-worker header duplication
- Simpler to implement and understand
- Keeps behavior predictable for same-origin creations

**Cons:**
- Risk of cross-origin policy leakage where a document's policy could improperly constrain another origin's worker
- Violates origin isolation principles
- If `Document-Policy` is always inherited, every worker created by an opted-in document would automatically enable the underlying feature hooks, such as self-js-profiling api, introducing unnecessary runtime overhead even when those features are unused.

### Alternative 2: Opt-in Inheritance via Constructor Flag

In this approach, inheritance of the creator's `Document-Policy` is explicitly gated by a constructor option at worker creation time.

**API Design:**
```webidl
partial dictionary WorkerOptions {
  boolean inheritDocumentPolicy = false; // optional
};
```

**Semantics:**
- When `inheritDocumentPolicy` is true: Worker inherits creator's effective Document Policy for both local and network scripts
- When false or unspecified: Worker does not inherit, policy enforcement is disabled by default
- Applies to Dedicated and Shared Workers only
- Service Workers always derive policy from the registration script response

**Pros:**
- Gives developers explicit control
- Helps prevent unintentional policy propagation
- Opt-in approach is safer by default

**Cons:**
- Adds new API surface and complexity
- Diverges from existing worker-creation semantics
- Introduces additional specification and testing burden
- Requires developers to explicitly opt-in for workers, which is cumbersome

## Privacy, and Security Considerations

- Document Policy inheritance is limited to local URLs (blob:, data:), consistent with the HTML policy container model, this prevents cross-origin policy leakage.
- Inherited policies cannot expand privileges beyond what the creator or script origin allows.
- Worker script responses define the effective policy, ensuring each origin controls its own features.
- Service Workers always use their registration script’s policy, keeping background execution isolated.
- The proposal adds no new fingerprinting or cross-origin exposure surfaces.

## References & Acknowledgements

Many thanks for valuable feedback and advice from:
- [Alex Russell](https://github.com/slightlyoff)
- [Ian Clelland](https://github.com/clelland) (Google)