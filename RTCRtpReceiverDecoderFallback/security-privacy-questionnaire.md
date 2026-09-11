# Security and Privacy Self-Review

**Proposal:** RTCRtpReceiver Decoder State Changed and Error Events  
**Status:** Working draft for internal review  
**Last updated:** September 11, 2026

This document answers the
[W3C Security and Privacy Self-Review Questionnaire](https://w3c.github.io/security-questionnaire/)
for the
[RTCRtpReceiver Decoder State Changed and Error Events proposal](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/RTCRtpReceiverDecoderFallback/explainer.md).

The answers reflect the current proposal and a possible expansion of the
WebRTC Stats
[hardware-exposure gate](https://w3c.github.io/webrtc-stats/#dfn-exposing-hardware-is-allowed)
for interactive media receiving scenarios such as cloud gaming.

## Proposed behavior under review

The proposal adds two events to `RTCRtpReceiver`:

- `decoderstatechange` reports that the receiver's decoder state changed.
  The motivating cases are codec changes and decoder implementation changes,
  including hardware-to-software fallback.
- `decodererror` reports a terminal, unrecoverable decoding failure using a
  generic [`EncodingError`](https://webidl.spec.whatwg.org/#encodingerror)
  `DOMException`.

The events contain the RTP timestamp associated with the affected media frame.
They do not directly contain the decoder name, hardware vendor, driver, or
device identifier.

Codec changes are already observable through ungated WebRTC statistics.
Decoder implementation changes are reflected in
[`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation)
and
[`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder),
which are currently available only when exposing hardware is allowed. Today,
that check returns true when the context capturing state is true.

The expanded gate under consideration extends the existing
[hardware-exposure algorithm](https://w3c.github.io/webrtc-stats/#dfn-exposing-hardware-is-allowed),
which currently relies on the
[context capturing state](https://w3c.github.io/mediacapture-main/#context-capturing-state):

```text
To check if decoder hardware exposure is allowed for receiver:

1. If the context capturing state is true, return true.
2. If receiver satisfies the active interactive media conditions,
   return true.
3. Return false.
```

A receiver would satisfy the active interactive media conditions when:

```text
The receiver is actively receiving video
AND its associated document is fully active, visible, and focused
AND at least one qualifying interaction condition applies:
    pointer lock
    OR keyboard lock
    OR recent trusted gamepad activity
    OR qualifying fullscreen use
```

The following details remain under discussion:

1. How recent gamepad activity is defined and when it expires.
2. Whether the event timestamp needs lower precision, coalescing, or rate
   limiting.
3. If a decoder implementation change occurs while the gating conditions are
   not satisfied, whether an event is fired when the conditions later become
   satisfied to report the decoder's current state.

## 2.1 What information does this feature expose, and for what purposes?

### Information exposed by `decoderstatechange`

The event reveals that the decoder associated with an `RTCRtpReceiver`
changed state and provides the RTP timestamp of the affected media frame. It
may be triggered by:

- A codec change. The application can already determine the active codec from
  the `RTCCodecStats` referenced by the inbound RTP statistics.
- A decoder implementation change, such as hardware-to-software fallback. If
  decoder hardware exposure is allowed, the application can call `getStats()`
  and inspect
  [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation)
  and
  [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder).

Although the event does not directly describe the decoder, firing it reveals
that a change occurred and when it occurred.

This lets an interactive streaming application respond promptly by lowering
resolution, renegotiating a codec, restarting the stream, or presenting
troubleshooting guidance.

### Information exposed by `decodererror`

The event reveals a terminal, unrecoverable decoding failure through a generic
`EncodingError` and the RTP timestamp of the affected frame. It does not
identify whether the decoder was hardware or software or expose
implementation-specific error details. This lets an application promptly
recover from or explain a frozen stream.

WebCodecs similarly reports decoding failures through the
[`VideoDecoder` error callback](https://w3c.github.io/webcodecs/#dom-videodecoderinit-error).
That callback only covers decoders created directly through WebCodecs; it
cannot report errors from the browser-managed decoder used by an
`RTCRtpReceiver`, which is the gap this proposal addresses.

### First-party information

The events make decoder changes and terminal failures easier for the first
party to detect. Some of this information can already be obtained through
existing WebRTC statistics or playback behavior:

- **Codec changes:** `getStats()` already reports the codec currently used by
  the receiver.
- **Terminal decoder failures:** The application can observe that playback
  freezes and use existing statistics to see that
  [`framesReceived`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-framesreceived)
  continues increasing while
  [`framesDecoded`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-framesdecoded)
  stops increasing. This indicates that complete video frames continue to
  arrive but are no longer being successfully decoded.
  [`freezeCount`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-freezecount)
  may also increase, providing additional evidence that playback has frozen.
- **Decoder implementation changes:** When the existing capture-based
  hardware-exposure gate is satisfied, `getStats()` already exposes
  [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation)
  and
  [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder).

The expanded gate makes the protected decoder statistics available in
receiving-only interactive media scenarios, such as cloud gaming, where the
page receives WebRTC video without capturing the user's camera, microphone,
or screen.

### Third-party information

Cross-origin iframe use is out of scope. The receiver and qualifying
interaction must belong to the first-party document.

## 2.2 Do features in this specification expose the minimum amount of information necessary to implement the intended functionality?

Yes. The events are intentionally coarse:

- `decoderstatechange` contains only an RTP timestamp and does not directly
  identify the decoder or describe the change.
- `decodererror` contains a generic `EncodingError` and does not expose
  implementation-specific failure information.
- The proposal does not expose decoder capacity, the number of hardware
  decoding sessions, the GPU model, the driver version, or a persistent device
  identifier.

The application must use existing WebRTC statistics to determine what changed.
Protected decoder statistics remain subject to a gate.

## 2.3 Do the features in this specification expose personal information, personally identifiable information, or information derived from either?

Not directly. The proposal does not expose a person's name, account, location,
communications, media content, or other conventional personal information. It
does expose potentially identifying information about decoder behavior,
power efficiency, change timing, and shared hardware availability.

These signals may add to the browser's fingerprinting surface when combined
with other information. Decoder-change timing could also reveal changes in
shared hardware availability, potentially allowing a site to infer that
another tab or application started or stopped using video-decoding resources.

The proposal minimizes these risks by preventing passive or background access:
protected decoder information is available only for the affected receiver,
while it is actively receiving video in a fully active, visible, and focused
document with a qualifying user-interaction signal.

## 2.4 How do the features in this specification deal with sensitive information?

The proposal does not intentionally expose sensitive personal information,
but decoder and shared-resource signals may become sensitive when combined
with other data.

The proposal minimizes this risk by:

- Exposing no hardware or decoder details in the event payload and continuing
  to gate protected statistics.
- Requiring active incoming video in a fully active, visible, and focused
  document with a qualifying user-interaction signal.
- Limiting access to the qualifying video receiver and clearing saved
  qualifying state when the receiver or document session ends.

## 2.5 Does data exposed by this specification carry related but distinct information that may not be obvious to users?

Yes.

A decoder implementation change may carry secondary information beyond the
quality of the current stream:

- Changes in shared hardware availability may reveal that another tab,
  browser profile, or application started or stopped using video-decoding
  resources.
- Cooperating origins may attempt to consume and release decoder capacity
  while observing decoder changes, creating a low-bandwidth covert channel or
  allowing activity to be correlated.

Example:

```text
Site A starts enough decoding sessions to consume shared hardware capacity.
Site B observes that its stream changes to a less efficient decoder.
Site A releases the capacity.
Site B observes another decoder change.
```

Whether this channel works reliably depends on the browser, operating system,
hardware, codec, stream configuration, and decoder-allocation policy.
The event may nevertheless make these changes easier to observe than existing
performance heuristics.

The active interactive media conditions prevent passive monitoring by pages
that are hidden, unfocused, not actively receiving video, or lack a qualifying
user-interaction signal. However, a page that satisfies these conditions could
still potentially observe decoder changes caused by other users of shared
hardware resources.

## 2.6 Do the features in this specification introduce state that persists across browsing sessions?

No. Any saved qualifying state is limited to the current receiver and
document. It is cleared when the receiver's track ends, the receiver is
replaced, or the document navigates or is discarded. It does not persist
across browsing sessions.

## 2.7 Do the features in this specification expose information about the underlying platform to origins?

Yes. `decoderImplementation` describes the decoder selected by the browser,
and `powerEfficientDecoder` reports whether the active decoder is considered
power-efficient. Their values and changes may reveal information about
hardware support, software fallback, and shared decoder availability.

The expanded gate applies to both fields. Exposure is limited to the affected
receiver while it is actively receiving video in a fully active, visible, and
focused document with a qualifying interaction signal. The proposal does not
expose decoder capacity, device identifiers, GPU models, or driver details.

## 2.8 Does this specification allow an origin to send data to the underlying platform?

No new mechanism is introduced. The events only report changes and failures
in the existing WebRTC decoding path; they do not let an application directly
select, configure, reserve, or control a hardware decoder.

## 2.9 Do features in this specification enable access to device sensors?

No. Gamepad activity may be used as a qualifying interaction signal, but the
proposal does not expose new gamepad data, enumerate gamepads, or reveal their
models. Only trusted input observed by the browser can qualify.

## 2.10 Do features in this specification enable new script execution or loading mechanisms?

No. It adds events to an existing WebRTC object and does not introduce a new
way to load or execute scripts.

## 2.11 Do features in this specification allow an origin to access other devices?

No. It operates on media already received through an existing
`RTCPeerConnection` and does not discover or connect to local, remote, or
attached devices.

## 2.12 Do features in this specification allow an origin some measure of control over a user agent's native UI?

No new control is introduced. The gate may rely on existing browser-managed
states such as fullscreen, pointer lock, or keyboard lock, but this proposal
does not activate those states or change their existing safeguards.

## 2.13 What temporary identifiers do the features in this specification create or expose to the web?

No new identifier is created. The event includes an RTP timestamp associated
with a frame in the existing WebRTC session. It is not intended to identify a
user or device across contexts. Whether its precision adds meaningful timing
or correlation risk remains under review.

## 2.14 How does this specification distinguish between behavior in first-party and third-party contexts?

The expanded gate is limited to first-party use. The receiver and qualifying
interaction must belong to the first-party document. Cross-origin iframe use
and delegation are out of scope.

## 2.15 How do the features in this specification work in Private Browsing or Incognito mode?

The API and gating behavior should be the same in private and normal browsing,
and no qualifying state should remain after a private session ends.

If normal and private contexts share decoder hardware, decoder changes could
potentially help correlate activity between them. Whether this is possible
depends on the browser's resource-isolation model.

## 2.16 Does this specification have both Security Considerations and Privacy Considerations sections?

Yes. The explainer includes separate
[Privacy Considerations](./explainer.md#privacy-considerations) and
[Security Considerations](./explainer.md#security-considerations) sections
describing the feature-specific risks and mitigations.

## 2.17 Do features in this specification enable origins to downgrade default security protections?

No security protection is downgraded. The proposal broadens the privacy gate
for two decoder statistics, but only for the affected receiver when the active
interactive media conditions are satisfied.

## 2.18 What happens when a document that uses this feature is kept alive in BFCache?

A document in BFCache is not fully active, so it cannot satisfy the gate,
receive decoder events, or access protected decoder statistics through the
expanded gate.

The behavior after the document is restored is still under consideration. In
particular, if a decoder change occurred while the document was inactive and
the gating conditions later become satisfied, it is not yet decided whether
the browser reports the decoder's current state through an event or reports
only subsequent decoder changes.

<!--
Proposed behavior:

Events are not queued or replayed. If the document is restored, the browser
recalculates the gating conditions. If access becomes allowed, `getStats()`
reflects the current decoder state. Changes that occurred while the document
was in BFCache are not replayed. Events fire only for new decoder changes that
occur after restoration while the gating conditions are satisfied.
-->

## 2.19 What happens when a document that uses this feature gets disconnected?

A disconnected document is not fully active. It stops receiving decoder
events and can no longer access the gated `decoderImplementation` and
`powerEfficientDecoder` statistics. Events are not queued for later delivery.

## 2.20 Does this specification define when and how new kinds of errors should be raised?

Yes. `decodererror` fires only for a terminal, unrecoverable decoding failure.
A successful fallback may instead produce `decoderstatechange`, subject to the
decoder hardware-exposure gate.

The event reports a generic `EncodingError` for the affected receiver. It does
not identify the decoder, hardware, driver, platform error code, or whether the
failure occurred in hardware or software. The error message must not contain
decoder-, hardware-, driver-, or platform-specific information.

## 2.21 Does this feature allow sites to learn about the user's use of assistive technology?

No. The proposal does not reveal which qualifying interaction signal was used
or whether the user relies on assistive technology. Supporting multiple
qualifying signals also avoids requiring a specific input method.

## 2.22 What should this questionnaire have asked?

One useful additional question is:

> Does an event or live-status API expose changes in shared resource
> availability that one origin can intentionally influence and another origin
> can observe?

This covers timing channels created by contention for shared hardware
resources, which is different from static hardware fingerprinting.
