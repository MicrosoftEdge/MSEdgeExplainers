# JavaScript Self-Profiling API: Conditional Marker Exposure

## Authors:

- Emmanuel Romero Ruiz (Microsoft)

## Participate
- [JavaScript Self-Profiling API Specification](https://wicg.github.io/js-self-profiling/)
- [TAG Security Review Discussion](https://github.com/w3ctag/design-reviews/issues/682)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

- [Introduction](#introduction)
- [User-Facing Problem](#user-facing-problem)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Proposed Approach](#proposed-approach)
- [Alternatives considered](#alternatives-considered)
- [Accessibility, Privacy, and Security Considerations](#accessibility-privacy-and-security-considerations)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [References & acknowledgements](#references--acknowledgements)

## Introduction

This explainer describes a modification to the JavaScript Self-Profiling API that enables conditional exposure of ProfilerMarker values based on context isolation status. The change moves marker control logic from IDL-level restrictions to explicit C++ implementation, allowing safe markers (`layout`, `style`) to be available in non-isolated contexts while maintaining security boundaries for sensitive markers.

## User-Facing Problem

Web developers need detailed performance insights to optimize their applications, but the current JavaScript Self-Profiling API markers feature has an all-or-nothing approach that unnecessarily restricts access to safe performance data.

Currently, all markers are gated behind Cross-Origin Isolation, which requires developers to:
1. Set specific HTTP headers (`Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Opener-Policy: same-origin`)
2. Ensure all embedded content is properly configured for isolation
3. Accept limitations on cross-origin resource loading

This high barrier prevents developers from accessing basic layout and style performance markers that pose no security risk and are already observable through existing DOM and CSSOM APIs.

### Goals

- **Enable graduated marker disclosure**: Allow safe markers in non-isolated contexts while restricting sensitive ones
- **Improve developer experience**: Reduce barriers to accessing basic performance insights
- **Maintain security boundaries**: Preserve protection for sensitive timing information
- **Ensure backward compatibility**: Existing code continues to work without modification

### Non-goals

- **Exposing all markers universally**: Sensitive markers (`gc`, `paint`, `script`) still require Cross-Origin Isolation
- **Removing Cross-Origin Isolation requirements entirely**: The isolation requirement remains for sensitive operations
- **Adding new marker types**: This change only affects the exposure model of existing markers

## User research

This modification addresses feedback from web developers who found the current all-or-nothing approach too restrictive for basic performance monitoring use cases. The change is informed by:

1. **Security analysis**: Layout and style information is already exposed through DOM APIs (`getBoundingClientRect()`, `getComputedStyle()`) and CSSOM APIs
2. **Developer feedback**: Requests for access to basic performance markers without the complexity of Cross-Origin Isolation setup
3. **Industry consultation**: Discussions with browser implementers and web performance experts

## Proposed Approach

The solution introduces conditional marker exposure through C++ implementation logic, replacing the previous IDL-level gating mechanism.

### Dependencies on non-stable features

This feature depends on:
- The base JavaScript Self-Profiling API (currently in WICG specification)

### Solving safe marker access with this approach

```js
// Regular context (no Cross-Origin Isolation required)
const profiler = new Profiler({sampleInterval: 5, maxBufferSize: 1000});

// Trigger various browser activities
document.body.style.color = 'blue';  // Style recalculation  
document.body.offsetHeight;          // Layout
new Array(1000000);                  // Potential GC (won't be exposed)

const trace = await profiler.stop();

// Sample output with filtered markers:
console.log(trace.samples);
// [
//   { timestamp: 1234.5, stackId: 2 },                    // gc marker filtered out
//   { timestamp: 1235.0, stackId: 3, marker: "layout" },  // allowed
//   { timestamp: 1235.5, stackId: 1, marker: "style" },   // allowed
//   { timestamp: 1236.0, stackId: 4 }                     // paint marker filtered out
// ]
```

### Implementation approach

The solution replaces IDL-level restrictions with explicit C++ logic:

**Before:**
```idl
[RuntimeEnabled=ExperimentalJSProfilerMarkers, CrossOriginIsolated] ProfilerMarker marker;
```

**After:**
```idl
[RuntimeEnabled=ExperimentalJSProfilerMarkers] ProfilerMarker marker;
```

The Cross-Origin Isolation check moves to C++ implementation with filtering logic that allows safe markers in non-isolated contexts.

## Alternatives considered

### Alternative 1: Maintain IDL-level gating

**Description**: Keep the current approach where all markers require Cross-Origin Isolation.

**Rejected because**: This maintains unnecessarily high barriers for accessing safe performance data that's already available through other APIs. Developer feedback indicated this approach was too restrictive for common use cases.

### Alternative 2: Remove all Cross-Origin Isolation requirements

**Description**: Make all markers available in all contexts without any isolation requirements.

**Rejected because**: This would expose sensitive timing information (`gc`, `paint`, `script`) that could leak cross-origin resource information and enable timing attacks. Security review indicated this approach would introduce unacceptable privacy risks.

### Alternative 3: Create separate APIs for safe vs. sensitive markers

**Description**: Split markers into different APIs or interfaces based on security sensitivity.

**Rejected because**: This would complicate the API surface and require developers to use multiple profiling interfaces. The graduated disclosure approach within a single API provides better developer experience while maintaining security boundaries.

## Accessibility, Privacy, and Security Considerations

### Security Considerations

**Safe markers in non-isolated contexts:**
- `layout`: Layout state information is already available via DOM APIs like `getBoundingClientRect()` and `getComputedStyle()`
- `style`: Style computation state is accessible through CSSOM APIs and observable via existing timing mechanisms

**Restricted markers requiring Cross-Origin Isolation:**
- `gc`: Garbage collection timing could leak memory patterns and cross-origin resource information
- `paint`: Paint timing might reveal information about cross-origin opaque resources that wouldn't pass Timing-Allow-Origin checks
- `script`: Script execution state could expose sensitive timing information about cross-origin activities

**Security model:**
- Information already available through other APIs can be safely exposed
- Sensitive timing information requires explicit Cross-Origin Isolation opt-in
- Feature flag provides overall control independent of isolation status

### Privacy Considerations

- **Reduced fingerprinting surface**: Non-isolated contexts have access to fewer markers, reducing potential fingerprinting vectors
- **Principle of least privilege**: Only necessary information is exposed based on context security level
- **Existing exposure**: Safe markers don't introduce new privacy leaks beyond what's already available through DOM/CSSOM APIs

### Accessibility Considerations

This change has no direct accessibility impact as it affects a performance measurement API rather than user-facing functionality.

## Stakeholder Feedback / Opposition

- **Microsoft**: Positive - This proposal comes from Microsoft to help the web community and first-party customers access basic performance markers while maintaining appropriate security boundaries

This proposal addresses the need for a graduated approach to balance usability with security requirements, as identified in previous TAG security review discussions.

## References & acknowledgements

Thanks to the following specifications and projects that influenced this proposal:

- [JavaScript Self-Profiling API Specification](https://wicg.github.io/js-self-profiling/)
- [Cross-Origin Isolation Explainer](https://web.dev/coop-coep/)
- [Performance Timeline API](https://w3c.github.io/performance-timeline/)
- [Element Timing API security considerations](https://wicg.github.io/element-timing/#sec-security)
