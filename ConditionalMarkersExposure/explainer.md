# JavaScript Self-Profiling API: Conditional Marker Exposure

## Table of Contents
1. [Introduction](#introduction)
2. [Problem Statement](#problem-statement)
3. [Proposed Solution](#proposed-solution)
4. [Behavioral Changes](#behavioral-changes)
5. [Security Analysis](#security-analysis)
6. [API Impact](#api-impact)
7. [Examples](#examples)
8. [Compatibility](#compatibility)

## Introduction

This explainer describes a proposed modification to the JavaScript Self-Profiling API that enables conditional exposure of `ProfilerMarker` values based on context isolation status. The change allows selective disclosure of markers based on their security sensitivity, improving developer experience while maintaining security boundaries.

## Problem Statement

### Current Limitation

The current JavaScript Self-Profiling API markers feature has some limitations:

- **All-or-nothing approach**: Markers are either completely available in Cross-Origin Isolated contexts or completely unavailable in non-isolated contexts
- **Overly restrictive**: Safe markers that don't pose security risks are unnecessarily gated behind Cross-Origin Isolation
- **Limited flexibility**: No mechanism for selective marker exposure based on security sensitivity

### Goals

- Enable selective marker exposure based on security sensitivity
- Allow safe markers (`layout`, `style`) in non-isolated contexts  
- Maintain explicit control over marker feature availability
- Preserve security boundaries while improving developer experience

## Proposed Solution

### Key Changes

1. **Graduated disclosure**: Allow certain safe markers (`layout`, `style`) in non-isolated contexts
2. **Security-based filtering**: Continue to restrict sensitive markers (`gc`, `paint`, `script`) to Cross-Origin Isolated contexts
3. **Transparent operation**: No changes to the API surface; filtering happens internally

### Rationale

Layout and style state information is already exposed through other browser APIs (DOM APIs and CSSOM), making these markers safe for broader availability without introducing new security risks.

## Behavioral Changes

| Context Type | Feature Flag | Available Markers |
|-------------|-------------|-------------------|
| Cross-Origin Isolated | Enabled | All markers (`gc`, `layout`, `paint`, `script`, `style`) |
| Cross-Origin Isolated | Disabled | None |
| Non-Isolated | Enabled | Limited (`layout`, `style` only) |
| Non-Isolated | Disabled | None |

## Security Analysis

### Safe Markers in Non-Isolated Contexts

- **`layout`**: Layout state information is already available via DOM APIs such as `getBoundingClientRect()`, `getComputedStyle()`, and layout-triggering operations
- **`style`**: Style computation state is accessible through CSSOM APIs and style recalculation is observable via existing timing mechanisms

### Restricted Markers

The following markers remain restricted to Cross-Origin Isolated contexts due to potential security implications:

- **`gc`**: Garbage collection timing could leak memory patterns and cross-origin resource information
- **`paint`**: Paint timing might reveal information about cross-origin opaque resources that wouldn't pass Timing-Allow-Origin checks
- **`script`**: Script execution state could expose sensitive timing information about cross-origin activities

### Security Model

This approach follows the principle of graduated disclosure, where:
1. Information already available through other APIs can be safely exposed
2. Sensitive timing information requires explicit Cross-Origin Isolation opt-in
3. The overall feature remains controlled by user agent implementation

## API Impact

### For Developers

The API surface remains unchanged from a developer perspective. The conditional exposure happens transparently:

```javascript
// Cross-origin isolated context
const profiler = new Profiler({sampleInterval: 10, maxBufferSize: 1000});
const trace = await profiler.stop();
// trace.samples may contain all marker types

// Non-isolated context  
const profiler = new Profiler({sampleInterval: 10, maxBufferSize: 1000});
const trace = await profiler.stop();
// trace.samples may contain layout/style markers only
```

### Trace Format

No changes to trace structure. The `marker` field in samples will be:
- Present with full marker data (Cross-Origin Isolated contexts)
- Present with filtered marker data (non-isolated contexts)
- Absent (feature disabled or no marker available)

## Examples

### Cross-Origin Isolated Context

```javascript
// Set required headers for Cross-Origin Isolation:
// Cross-Origin-Embedder-Policy: require-corp
// Cross-Origin-Opener-Policy: same-origin

const profiler = new Profiler({sampleInterval: 5, maxBufferSize: 1000});

// Trigger various browser activities
document.body.style.color = 'red';  // Style recalculation
document.body.offsetHeight;         // Layout
new Array(1000000);                 // Potential GC

const trace = await profiler.stop();

// Sample output may include all marker types:
console.log(trace.samples);
// [
//   { timestamp: 1234.5, stackId: 2, marker: "gc" },
//   { timestamp: 1235.0, stackId: 3, marker: "layout" },
//   { timestamp: 1235.5, stackId: 1, marker: "style" },
//   { timestamp: 1236.0, stackId: 4, marker: "paint" }
// ]
```

### Non-Isolated Context

```javascript
// Regular context (no special headers required)

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

### Feature Disabled

```javascript
const profiler = new Profiler({sampleInterval: 5, maxBufferSize: 1000});
const trace = await profiler.stop();

// No markers regardless of context isolation status:
console.log(trace.samples);
// [
//   { timestamp: 1234.5, stackId: 2 },
//   { timestamp: 1235.0, stackId: 3 },
//   { timestamp: 1235.5, stackId: 1 }
// ]
```

## Compatibility

### Backward Compatibility

- **No breaking changes**: Existing code continues to work without modification
- **Progressive enhancement**: Non-isolated contexts gain access to layout/style markers
- **Consistent behavior**: Cross-Origin Isolated contexts maintain full marker access

### Forward Compatibility

- **Extensible model**: Framework ready for additional "safe" markers in the future
- **Clear categorization**: Established security model for evaluating new marker types
- **Implementer guidance**: Clear criteria for determining marker safety

## References

- [JavaScript Self-Profiling API Specification](https://wicg.github.io/js-self-profiling/)
- [Cross-Origin Isolation](https://html.spec.whatwg.org/multipage/webappapis.html#concept-settings-object-cross-origin-isolated-capability)
- [Performance Timeline API](https://w3c.github.io/performance-timeline/)
- [TAG Security Review Discussion](https://github.com/w3ctag/design-reviews/issues/682)
- [Element Timing Security Considerations](https://wicg.github.io/element-timing/#sec-security)
