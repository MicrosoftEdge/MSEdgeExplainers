# JavaScript Self-Profiling API: Conditional Marker Exposure

## Table of Contents
1. [Introduction](#introduction)
2. [Problem Statement](#problem-statement)
3. [Proposed Solution](#proposed-solution)
4. [Behavioral Changes](#behavioral-changes)
5. [Security Analysis](#security-analysis)
6. [API Impact](#api-impact)
7. [Implementation Details](#implementation-details)
8. [Examples](#examples)
9. [Compatibility](#compatibility)
10. [Testing Strategy](#testing-strategy)

## Introduction

This explainer describes a modification to the JavaScript Self-Profiling API that changes how `ProfilerMarker` values are conditionally exposed based on context isolation status and feature flags. The change moves marker control logic from IDL-level restrictions to explicit C++ implementation, enabling graduated disclosure of markers based on their security sensitivity.

## Problem Statement

### Current Limitation

The current JavaScript Self-Profiling API markers feature has several limitations:

- **All-or-nothing approach**: Markers are controlled via IDL-level `CrossOriginIsolated` attribute, meaning either all markers are available or none
- **Overly restrictive**: Safe markers that don't pose security risks are unnecessarily gated behind Cross-Origin Isolation
- **Limited flexibility**: No mechanism for selective marker exposure based on security sensitivity

### Goals

- Enable selective marker exposure based on security sensitivity
- Allow safe markers (`layout`, `style`) in non-isolated contexts  
- Maintain explicit control over marker feature availability
- Preserve security boundaries while improving developer experience

## Proposed Solution

### Key Changes

1. **Move control logic from IDL to C++**: Replace IDL-level `CrossOriginIsolated` attribute with explicit conditional logic in `ProfilerTraceBuilder`
2. **Introduce graduated disclosure**: Allow `kLayout` and `kStyle` markers in non-isolated contexts
3. **Maintain feature flag control**: Respect `ExperimentalJSProfilerMarkersEnabled` flag for the entire feature

### Rationale

Layout and style state information is already exposed through other browser APIs (DOM APIs and CSSOM), making these markers safe for broader availability without introducing new security risks.

## Behavioral Changes

| Context Type | Feature Flag | Available Markers |
|-------------|-------------|-------------------|
| Cross-Origin Isolated | Enabled | All markers (`gc`, `layout`, `paint`, `script`, `style`) |
| Cross-Origin Isolated | Disabled | None |
| Non-Isolated | Enabled | Limited (`layout`, `style` only) |
| Non-Isolated | Disabled | None |

### Before This Change
```idl
dictionary ProfilerSample {
  required DOMHighResTimeStamp timestamp;
  unsigned long long stackId;
  [RuntimeEnabled=ExperimentalJSProfilerMarkers, CrossOriginIsolated] ProfilerMarker marker;
};
```

### After This Change
```idl
dictionary ProfilerSample {
  required DOMHighResTimeStamp timestamp;
  unsigned long long stackId;
  [RuntimeEnabled=ExperimentalJSProfilerMarkers] ProfilerMarker marker;
};
```

The Cross-Origin Isolation check is now handled in the C++ implementation rather than at the IDL level.

## Security Analysis

### Safe Markers in Non-Isolated Contexts

- **`kLayout`**: Layout state information is already available via DOM APIs such as `getBoundingClientRect()`, `getComputedStyle()`, and layout-triggering operations
- **`kStyle`**: Style computation state is accessible through CSSOM APIs and style recalculation is observable via existing timing mechanisms

### Restricted Markers

The following markers remain restricted to Cross-Origin Isolated contexts due to potential security implications:

- **`kGC`**: Garbage collection timing could leak memory patterns and cross-origin resource information
- **`kPaint`**: Paint timing might reveal information about cross-origin opaque resources that wouldn't pass Timing-Allow-Origin checks
- **`kScript`**: Script execution state could expose sensitive timing information about cross-origin activities

### Security Model

This approach follows the principle of graduated disclosure, where:
1. Information already available through other APIs can be safely exposed
2. Sensitive timing information requires explicit Cross-Origin Isolation opt-in
3. The feature flag provides overall control independent of isolation status

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

## Implementation Details

### New Method: `GetMarker()`

The core logic is implemented in the new `GetMarker()` method:

```cpp
std::optional<V8ProfilerMarker> ProfilerTraceBuilder::GetMarker(
    const v8::EmbedderStateTag embedder_state,
    const v8::StateTag fallback_state) {
  // 1. Check feature flag
  const bool are_markers_enabled =
      RuntimeEnabledFeatures::ExperimentalJSProfilerMarkersEnabled();
  if (!are_markers_enabled) {
    return std::nullopt;
  }

  // 2. Get marker from state
  std::optional<V8ProfilerMarker> marker =
      BlinkStateToMarker(embedder_state, fallback_state);
  if (!marker.has_value()) {
    return marker;
  }

  // 3. Apply security filtering for non-isolated contexts
  ExecutionContext* execution_context = ExecutionContext::From(script_state_);
  const bool is_cross_origin_isolated =
      execution_context->CrossOriginIsolatedCapabilityOrDisabledWebSecurity();
  if (!is_cross_origin_isolated) {
    marker = ProfileMarkerToPublicMarker(*marker);
  }
  
  return marker;
}
```

### Filtering Logic

The filtering logic determines which markers are safe for non-isolated contexts:

```cpp
inline std::optional<V8ProfilerMarker> ProfileMarkerToPublicMarker(
    const V8ProfilerMarker marker) {
  switch (marker.AsEnum()) {
    case V8ProfilerMarker::Enum::kStyle:
    case V8ProfilerMarker::Enum::kLayout:
      return marker;  // Allow these in non-isolated contexts
    default:
      return std::nullopt;  // Filter out everything else
  }
}
```

### Integration Point

The new method replaces the direct call to `BlinkStateToMarker`:

```cpp
// Before:
if (std::optional<blink::V8ProfilerMarker> marker =
        BlinkStateToMarker(embedder_state, state)) {
  sample->setMarker(*marker);
}

// After:
if (std::optional<blink::V8ProfilerMarker> marker =
        GetMarker(embedder_state, state)) {
  sample->setMarker(*marker);
}
```

## Examples

### Feature Enabled, Cross-Origin Isolated Context

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

### Feature Enabled, Non-Isolated Context

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
- **Maintainable implementation**: Clear separation between security logic and marker detection

## Testing Strategy

### Test Coverage Areas

Comprehensive testing covers all scenarios:

1. **Feature flag behavior**: Verify markers are completely disabled when `ExperimentalJSProfilerMarkersEnabled` is false
2. **Cross-origin isolated contexts**: Verify full marker availability (all marker types)
3. **Non-isolated contexts**: Verify filtered marker availability (layout/style only)
4. **Edge cases**: Handle invalid states, missing execution contexts, and boundary conditions
5. **Security boundaries**: Verify filtering works correctly and sensitive markers are not leaked

### Test Cases Added

The implementation includes extensive test coverage:

- `AddVMStateMarkerCrossOriginIsolated`: Tests VM state markers in isolated contexts
- `AddEmbedderStateMarkerCrossOriginIsolated`: Tests embedder state markers in isolated contexts  
- `AddEmbedderStateMarkerFeatureDisabled`: Tests behavior when feature flag is disabled
- Enhanced existing `AddEmbedderStateMarker` test: Tests non-isolated context behavior

### Test Implementation Pattern

```cpp
TEST_F(ProfilerTraceBuilderTest, AddEmbedderStateMarkerCrossOriginIsolated) {
  V8TestingScope scope;
  
  // Enable the markers feature
  ScopedExperimentalJSProfilerMarkersForTest enable_markers(true);
  
  // Set up Cross-Origin Isolation
  MockPolicyContainerHost host;
  SetCrossOriginIsolated(host, scope);
  
  // Verify full marker availability
  // ... test implementation
}
```

## References

- [JavaScript Self-Profiling API Specification](https://wicg.github.io/js-self-profiling/)
- [Cross-Origin Isolation Explainer](https://web.dev/coop-coep/)
- [Performance Timeline API](https://w3c.github.io/performance-timeline/)
- [TAG Security Review Discussion](https://github.com/w3ctag/design-reviews/issues/682)
- [Element Timing Security Considerations](https://wicg.github.io/element-timing/#sec-security)
