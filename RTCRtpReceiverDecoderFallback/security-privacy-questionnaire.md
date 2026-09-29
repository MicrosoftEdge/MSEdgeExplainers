# Security and Privacy Self-Review

**Proposal:** RTCRtpReceiver Decoder State Changed and Error Events  
**Status:** Completed self-review  
**Last updated:** September 17, 2026

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

- `decoderstatechange` reports codec or decoder implementation changes,
  including hardware-to-software fallback.
- `decodererror` reports a decoding failure as a
  generic [`EncodingError`](https://webidl.spec.whatwg.org/#encodingerror)
  `DOMException`.

The events do not expose a decoder name, hardware vendor, driver, or device
identifier. Codec changes are already observable through ungated statistics.
Decoder implementation changes are reflected in
[`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation)
and
[`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder),
which are protected by the
[hardware-exposure gate](https://w3c.github.io/webrtc-stats/#dfn-exposing-hardware-is-allowed).
The existing gate allows exposure when the context capturing state is true.

The proposed receiver-specific path uses two states:

- **Interactive media session recognition** records that a receiver has
  demonstrated an interactive-media use case.
- **Active interactive media state** determines whether that recognized
  receiver is currently eligible for hardware exposure.

### Interactive media session recognition

An `RTCRtpReceiver` establishes **interactive media session recognition**
when:

- Its associated document is visible and focused.
- It has a live video track and has recently received and successfully decoded
  a video frame.
- It has pointer lock, keyboard lock, a gamepad user gesture within the recent
  trusted-input duration, or fullscreen with recent keyboard, pointer, or
  touch input.

Recognition is receiver-specific. It persists through temporary loss of focus
or visibility, the end of pointer or keyboard lock, and expiration of the
recent-input window.

### Active interactive media state

A receiver is in the **active interactive media state** while:

- It is recognized as belonging to an interactive-media session.
- Its associated document is visible and focused.
- It has a live video track and has recently successfully decoded a frame.

Protected information is exposed only while these conditions remain true.

The existing capture-based condition remains unchanged. When the
hardware-exposure check is invoked with a receiver, that receiver's active
interactive-media state provides an additional way to allow exposure. Calls
without a receiver, including calls for protected outbound statistics, retain
the existing capture-based behavior.

If a recognized receiver temporarily leaves the active state, protected
information becomes unavailable but recognition persists. When it becomes
active again, one event reports its current decoder implementation if it
changed; intermediate changes are not replayed.

**Open question:** What duration, or acceptable range of durations, should
browsers use to decide whether a gamepad user gesture or
fullscreen-associated keyboard, pointer, or touch input is recent?

## 2.1 What information does this feature expose, and for what purposes?

### Information exposed

`decoderstatechange` reveals that an `RTCRtpReceiver` changed codec or decoder
implementation and provides the RTP timestamp associated with the change. The
event does not identify what changed; the application uses existing WebRTC
statistics to inspect the receiver's current state.

`decodererror` reveals a decoding failure through a generic
`EncodingError` and an associated RTP timestamp. It does not reveal whether
the decoder was hardware or software or expose implementation-specific error
details.

These events allow interactive streaming applications to respond promptly,
such as by renegotiating a codec, changing stream quality, restarting playback,
or explaining a frozen stream.

### First-party information

The events make existing or inferable information easier to detect:

- Codec information is already available through ungated WebRTC statistics.
- Decoder failures can be inferred when playback freezes while
  [`framesReceived`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-framesreceived)
  continues increasing and
  [`framesDecoded`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-framesdecoded)
  stops.
- When hardware exposure is allowed,
  [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation)
  and
  [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder)
  already expose the active decoder's implementation and efficiency.

The receiver-specific gate makes the protected decoder statistics available
to qualifying receiving-only interactive-media applications, such as cloud
gaming, without requiring camera, microphone, or screen capture.

### Third-party information

Cross-origin iframe use and delegation are out of scope. The receiver and
qualifying interaction must belong to the first-party context.

## 2.2 Do features in this specification expose the minimum amount of information necessary to implement the intended functionality?

Yes. `decoderstatechange` exposes only an RTP timestamp, while `decodererror`
exposes a generic `EncodingError`. Neither event exposes decoder identity,
hardware capacity, GPU or driver details, or a persistent identifier.
Applications use existing WebRTC statistics to determine what changed, and
protected statistics remain gated.

## 2.3 Do the features in this specification expose personal information, personally identifiable information, or information derived from either?

Not directly. The proposal does not expose a person's name, account, location,
communications, media content, or other conventional personal information. It
does expose potentially identifying information about decoder behavior,
power efficiency, change timing, and shared hardware availability.

These signals may contribute to fingerprinting or allow a site to infer that
another tab or application started or stopped using shared video-decoding
resources. These risks are limited by the
[interactive media session recognition](#interactive-media-session-recognition)
and [active interactive media state](#active-interactive-media-state)
requirements described above, which prevent passive or background access and
scope exposure to a specific receiver.

## 2.4 How do the features in this specification deal with sensitive information?

The proposal does not intentionally expose sensitive personal information,
but decoder and shared-resource signals may become sensitive when combined
with other data. It minimizes this risk by exposing no implementation details
in event payloads, continuing to gate protected statistics, and limiting
receiver-specific exposure through the
[interactive media session recognition](#interactive-media-session-recognition)
and [active interactive media state](#active-interactive-media-state)
requirements described above.

## 2.5 Does data exposed by this specification carry related but distinct information that may not be obvious to users?

Yes.

A decoder implementation change may reveal that another tab, browser profile,
or application started or stopped using shared hardware-decoding resources.
Cooperating origins could also create a low-bandwidth channel by consuming and
releasing decoder capacity while observing decoder changes.

Example:

```text
Site A starts enough decoding sessions to consume shared hardware capacity.
Site B observes that its stream changes to a less efficient decoder.
Site A releases the capacity.
Site B observes another decoder change.
```

The reliability of this signal depends on the browser, operating system,
hardware, codec, and decoder-allocation policy, but the event may make it
easier to observe than existing performance heuristics.

The
[interactive media session recognition](#interactive-media-session-recognition)
and [active interactive media state](#active-interactive-media-state)
requirements limit receiver-specific exposure to an active interactive use
case. An eligible page might nevertheless observe decoder changes caused by
other users of shared hardware resources.

## 2.6 Do the features in this specification introduce state that persists across browsing sessions?

No. [Interactive media session recognition](#interactive-media-session-recognition)
is scoped to the current receiver and document and does not persist across
browsing sessions. It ends when the track, connection, or document session
ends, or when successful decoding stops for the session-termination period.
Temporary focus, visibility, lock, or recent-input changes do not alone end
recognition.

## 2.7 Do the features in this specification expose information about the underlying platform to origins?

Yes. `decoderImplementation` describes the decoder selected by the browser,
and `powerEfficientDecoder` reports whether the active decoder is considered
power-efficient. These fields may reveal hardware support, software fallback,
and changes in shared decoder availability. Both remain subject to the
[interactive media session recognition](#interactive-media-session-recognition)
and [active interactive media state](#active-interactive-media-state)
requirements described above. The proposal does not expose decoder capacity,
device identifiers, GPU models, or driver details.

## 2.8 Does this specification allow an origin to send data to the underlying platform?

No new mechanism is introduced. The events only report changes and failures
in the existing WebRTC decoding path; they do not let an application directly
select, configure, reserve, or control a hardware decoder.

## 2.9 Do features in this specification enable access to device sensors?

No. A gamepad user gesture may be used as a qualifying interaction signal, but
the proposal does not expose new gamepad data, enumerate gamepads, or reveal
their models. Only trusted input observed by the browser can qualify.

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

No new identifier is created. The event's RTP timestamp identifies a frame
within the existing WebRTC session; it is not a persistent identifier for a
user or device across contexts.

## 2.14 How does this specification distinguish between behavior in first-party and third-party contexts?

The receiver, its associated document, and the qualifying interaction must
belong to the first-party context. Receiver-specific exposure and delegation
in cross-origin iframes are out of scope.

## 2.15 How do the features in this specification work in Private Browsing or Incognito mode?

The API and gate behave the same in private and normal browsing, and
recognition does not persist after a private session ends. If the contexts
share decoder hardware, decoder changes might allow activity to be correlated,
depending on the browser's resource-isolation model.

## 2.16 Does this specification have both Security Considerations and Privacy Considerations sections?

Yes. The explainer includes separate
[Privacy Considerations](./explainer.md#privacy-considerations) and
[Security Considerations](./explainer.md#security-considerations) sections
describing the feature-specific risks and mitigations.

## 2.17 Do features in this specification enable origins to downgrade default security protections?

No existing protection is removed. The new receiver-specific path is limited
by the
[interactive media session recognition](#interactive-media-session-recognition)
and [active interactive media state](#active-interactive-media-state)
requirements. Existing capture-based behavior and the protection of outbound
encoder statistics remain unchanged.

## 2.18 What happens when a document that uses this feature is kept alive in BFCache?

A document in BFCache cannot receive decoder events or access protected
decoder statistics. Entering BFCache ends the receiver's interactive media
session recognition. If the document is restored, the receiver must satisfy
the recognition conditions again. Changes that occurred while the document
was in BFCache are not queued or replayed.

## 2.19 What happens when a document that uses this feature gets disconnected?

A disconnected document is not fully active. It does not receive decoder
events and cannot access the gated `decoderImplementation` or
`powerEfficientDecoder` statistics. Disconnection ends the receiver's
interactive media session recognition. Events are not queued or replayed.

## 2.20 Does this specification define when and how new kinds of errors should be raised?

Yes. `decodererror` reports a decoding failure as a
generic `EncodingError`; a successful fallback may instead produce
`decoderstatechange`. The underlying failure is already observable or
inferable, but `decodererror` provides a prompt, direct indication. The events
do not expose decoder-, hardware-, driver-, platform-, or
implementation-specific error details.

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
