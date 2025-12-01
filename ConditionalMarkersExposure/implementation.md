# Conditional Marker Exposure Implementation

## Overview

This design document describes the implementation requirements for conditional marker exposure in the JavaScript Self-Profiling API.

## Key Implementation Requirements

### 1. IDL Changes

Remove the `CrossOriginIsolated` attribute from the `ProfilerSample` dictionary:

```diff
dictionary ProfilerSample {
  required DOMHighResTimeStamp timestamp;
  unsigned long long stackId;
- [RuntimeEnabled=ExperimentalJSProfilerMarkers, CrossOriginIsolated] ProfilerMarker marker;
+ [RuntimeEnabled=ExperimentalJSProfilerMarkers] ProfilerMarker marker;
};
```

### 2. New Method: `GetMarker()`

Implement the core logic in a new `GetMarker()` method in `ProfilerTraceBuilder`:

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

### 3. Filtering Logic

Implement `ProfileMarkerToPublicMarker()` to filter sensitive markers:

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

### 4. Integration Point

Replace the direct call to `BlinkStateToMarker` with the new `GetMarker()` method:

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

## Security Model

**Safe markers (allowed in non-isolated contexts):**
- `style`: Style computation state is accessible through CSSOM APIs
- `layout`: Layout state information is already available via DOM APIs (getBoundingClientRect, etc.)

**Restricted markers (require Cross-Origin Isolation):**
- `gc`: Garbage collection timing could leak memory patterns and cross-origin resource information
- `paint`: Paint timing might reveal information about cross-origin opaque resources
- `script`: Script execution state could expose sensitive timing information about cross-origin activities

## Implementation Verification

### Test Coverage

The implementation includes comprehensive test coverage for all scenarios:

```cpp
// Test isolated context - all markers available
TEST_F(ProfilerTraceBuilderTest, AddVMStateMarkerCrossOriginIsolated) {
  // Enable feature and set cross-origin isolation
  // Verify all marker types are exposed
}

// Test non-isolated context - filtered markers only
TEST_F(ProfilerTraceBuilderTest, AddEmbedderStateMarker) {
  // Default non-isolated context
  // Verify only kStyle and kLayout markers are exposed
}

// Test feature disabled
TEST_F(ProfilerTraceBuilderTest, AddEmbedderStateMarkerFeatureDisabled) {
  // Disable ExperimentalJSProfilerMarkersEnabled
  // Verify no markers are exposed regardless of context
}
```

### Behavioral Verification

Second implementers can verify correct behavior with these test patterns:

**Cross-Origin Isolated Context:**
```javascript
// Headers: Cross-Origin-Embedder-Policy: require-corp
//          Cross-Origin-Opener-Policy: same-origin
const trace = await profiler.stop();
// Should expose all marker types: gc, layout, paint, script, style
```

**Non-Isolated Context:**
```javascript
// Regular context (no special headers)
const trace = await profiler.stop();
// Should expose only: layout, style markers
// Should filter out: gc, paint, script markers
```

**Feature Disabled:**
```javascript
// ExperimentalJSProfilerMarkersEnabled = false
const trace = await profiler.stop();
// Should not expose any markers regardless of isolation status
```

