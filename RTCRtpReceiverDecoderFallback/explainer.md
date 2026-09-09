# RTCRtpReceiver Decoder State Changed and Error Events

**Authors**
* [Nishitha Burman Dey](https://github.com/nishitha-burman)
* [Steve Becker](https://github.com/SteveBeckerMSFT)
* [Diego Perez Botero](https://github.com/Diego-Perez-Botero)
* [Philipp Hancke](https://github.com/fippo)
* [Rahul Singh](https://github.com/rahulsingh-msft)
* [Iris Zhou](https://github.com/irisxzhou)

Much of this explainer synthesizes and consolidates prior discussions and contributions from members of the WebRTC working group.

## Participate
* [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/RTCRtpReceiverDecoderFallback)
* [Discussion forum](https://github.com/w3c/webrtc-extensions/issues/146)

## Introduction
Game streaming platforms like Xbox Cloud Gaming and Nvidia GeForce Now rely on hardware decoding in browsers to deliver low-latency, power-efficient experiences. During a stream, the decoder's state can change. The codec can be renegotiated, the receiver can fall back from hardware to software decoding, or the decoder can fail outright. Applications have no event-driven way to observe these changes and failures as they occur. The existing statistics must be polled and terminal decoder errors are not surfaced at all.

This proposal has two parts. The first part adds two events on the receiver. The `decoderstatechange` event fires when the decoder's state changes. Codec changes always fire it, while decoder implementation changes, such as hardware-to-software fallback, fire only while hardware exposure is allowed. The `decodererror` event fires when the decoder hits a terminal error. Together the events replace inefficient polling.

The second part expands the existing hardware-exposure check for actively used interactive media receivers. The current check has no input because context capturing state applies to the entire context. To add a receiver-specific condition without broadening access to protected outbound statistics, the check would accept an optional `RTCRtpReceiver`. This would allow qualifying non-capturing applications to receive implementation-change events and read the protected [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) statistics.

## User-Facing Problem
When the decoder fails terminally, playback freezes. The failure is not surfaced to the application, so there is no direct signal that decoding has stopped. The decoder's state can also change during a stream, for example when the codec is renegotiated. There is no event for these changes either. The only way to observe decoder state today is to poll [`getStats()`](https://w3c.github.io/webrtc-pc/#dom-rtcrtpreceiver-getstats) repeatedly, which is inefficient.

A related concern is decoder fallback. When the receiver falls back from a hardware to a software decoder, end users may experience increased latency, degraded quality, and battery drain. Developers would like to detect this in real time. They previously relied on the [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) statistic. As of Chromium M110+, it is available only while the application is capturing camera or microphone input. The first part of this proposal preserves the existing hardware-exposure check while replacing polling with an event for applications that already qualify. Today, the check allows exposure only when the context capturing state is true. That condition fits real-time communication but not interactive streaming, where media capture is unrelated to the application's need to react to decoder fallback.

The second part of this proposal would broaden decoder hardware exposure for a specific `RTCRtpReceiver` without requiring capture. The receiver's document would need to be visible and focused, the receiver would need to be actively receiving and decoding live WebRTC video, and the user would need to be demonstrably interacting with the experience. Qualifying interaction conditions could include pointer lock, keyboard lock, recent meaningful gamepad activity, or fullscreen combined with recent user input. These conditions could allow applications to react to fallback during an active interactive session without exposing protected decoder information to passive or background contexts.

## Goals
* Enable developers to detect codec changes and decoder errors at runtime without requiring additional permissions like `getUserMedia()`.
* Allow applications to diagnose regressions (e.g. codec negotiation issues, device specific problems).
* Support user experience improvements by enabling apps to adapt (e.g. lowering resolution, re-negotiating codecs), alert end users to decoder errors, and display troubleshooting information.
* After the events are defined, expand the conditions under which hardware exposure is allowed to support non-capturing interactive streaming while limiting exposure to a specific, actively used receiver.

## Non-goals
* Exposing vendor-specific hardware information.
* Exposing deterministic codec support/capabilities beyond what [`MediaCapabilities`](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capabilities_API) already provides.
* Providing detailed telemetry such as frame-level error counts or decoder identifiers.
* Exposing decoder hardware information to passive, background, preflight, or capability-probing contexts.

## User Research
Feedback from Xbox Cloud Gaming, Nvidia GeForce Now and similar partners shows:
* Decoder changes (e.g. fallback from hardware to software decoding) are common in the field. Developers lack visibility into when/why they occur.
* Reliance on `getUserMedia()` to query `decoderImplementation` has a high failure rate because users often deny permissions that are irrelevant to media playback.
* Previous workarounds (e.g. guessing based on decode times) have proven unreliable and masked bugs.
* Relying on `MediaCapabilities` is insufficient because it only provides a static capability hint and does not reflect runtime decoder changes, e.g. a fallback from hardware to software decoding.
* Without these signals, developers cannot reliably detect decoder changes or diagnose errors as they occur.

## Proposed Approach

### Part 1: Decoder state and error events

Introduce two events on [`RTCRtpReceiver`](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver):

* A **`decoderstatechange`** event that fires when the receiver's decoder state changes, for example a codec change or a hardware-to-software fallback. The event carries only the media frame's `rtpTimestamp`. Applications can read what changed through the receiver's [`getStats()`](https://w3c.github.io/webrtc-pc/#dom-rtcrtpreceiver-getstats). See [Event triggers](#event-triggers) for details.
* A **`decodererror`** event that fires when the decoder encounters a terminal, unrecoverable failure, for example when hardware decoding fails and no software decoder is available for a negotiated codec such as H.265. Following [`SensorErrorEvent`](https://w3c.github.io/sensors/#sensorerrorevent) and [WebCodecs](https://w3c.github.io/webcodecs/#dom-videodecoderinit-error), the failure is surfaced as a [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException). Its [`name`](https://webidl.spec.whatwg.org/#dom-domexception-name) is [`EncodingError`](https://webidl.spec.whatwg.org/#encodingerror).

Codec changes and decoder errors are surfaced without requiring [`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) permission and are not subject to the decoder hardware-exposure gate. The `decodererror` event is coarse, carrying no decoder- or device-specific detail. Changes that reveal hardware-versus-software decoding are surfaced only when [exposing hardware is allowed](https://w3c.github.io/webrtc-stats/#dfn-exposing-hardware-is-allowed). This condition already gates the existing [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) stats, so the event reveals nothing the page cannot already read (see [Privacy Considerations](#privacy-considerations)). This enables applications to alert users, re-negotiate codecs, and debug issues at runtime.

#### Event triggers

Two changes trigger the `decoderstatechange` event:

* **The codec changes.** The receive codec is switched or renegotiated. Applications can read the new codec from the [`RTCCodecStats`](https://w3c.github.io/webrtc-stats/#codec-dict%2A) referenced by the inbound-rtp report's `codecId`.
* **The decoder implementation changes.** For example, the receiver falls back from a hardware decoder to a software decoder. Applications can read [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) from the inbound-rtp report. `getStats()` exposes these fields only when [exposing hardware is allowed](https://w3c.github.io/webrtc-stats/#dfn-exposing-hardware-is-allowed), so the event fires for this case under that same condition (see [Privacy Considerations](#privacy-considerations)).

The `decodererror` event fires when the decoder hits a terminal, unrecoverable failure, for example when hardware decoding fails and no software decoder is available for the negotiated codec (such as H.265). The failure is surfaced as an [`EncodingError`](https://webidl.spec.whatwg.org/#encodingerror) [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException). When a fallback succeeds (a software decoder is available), the receiver keeps decoding and may fire `decoderstatechange` instead, subject to the gating above.

#### Proposed IDL

```JavaScript
partial interface RTCRtpReceiver {
    attribute EventHandler ondecoderstatechange;
    attribute EventHandler ondecodererror;
};

interface RTCDecoderStateChangeEvent : Event {
    constructor(DOMString type, RTCDecoderStateChangeEventInit eventInitDict);

    // The RTP timestamp of the media frame associated with this event.
    readonly attribute unsigned long rtpTimestamp;
};

interface RTCDecoderErrorEvent : RTCDecoderStateChangeEvent {
    constructor(DOMString type, RTCDecoderErrorEventInit eventInitDict);

    // The inherited rtpTimestamp reports when the error occurred.
    readonly attribute DOMException error;
};
```

#### Example

```JavaScript
const pc = new RTCPeerConnection();

pc.addEventListener('track', (event) => {
  const receiver = event.receiver;

  // Codec changes are always reported. Decoder implementation changes are
  // reported only while hardware exposure is allowed for this receiver.
  receiver.addEventListener('decoderstatechange', async (ev) => {
    // Query getStats() for the codec currently in use on this receiver.
    const stats = await receiver.getStats();
    let codec = 'unknown';
    for (const report of stats.values()) {
      if (report.type === 'inbound-rtp' && report.codecId) {
        const codecStats = stats.get(report.codecId);
        if (codecStats) {
          codec = `${codecStats.mimeType}|${codecStats.sdpFmtpLine}`;
        }

        // decoderImplementation and powerEfficientDecoder are protected. They
        // are present only while hardware exposure is allowed.
        if (report.decoderImplementation) {
          logMetric(`Decoder implementation: ${report.decoderImplementation}`);
        }
        if (report.powerEfficientDecoder !== undefined) {
          logMetric(`Power efficient decoder: ${report.powerEfficientDecoder}`);
        }
        break;
      }
    }
    logMetric(`Decoder state change: codec=${codec}, time=${ev.rtpTimestamp}`);
  });

  // The error event reports a decoder failure.
  receiver.addEventListener('decodererror', (ev) => {
    // ev.error is a DOMException describing the failure. The inherited
    // rtpTimestamp marks when it occurred.
    showToast('Video playback error');
    logMetric(`Decoder error: ${ev.error.name} - ${ev.error.message}, time=${ev.rtpTimestamp}`);
  });
});

```

### Part 2: Expand the hardware-exposure check

Part 2 proposes extending the existing hardware-exposure check with an optional receiver input. When no receiver is supplied, the check would behave as it does today and allow exposure only when the context capturing state is true. When a receiver is supplied, the receiver's active interactive media state would provide another way for the check to return true.

To avoid requiring applications to repeatedly reestablish user intent after temporary focus or visibility changes, this proposal distinguishes recognition of an interactive media session from its current eligibility for hardware exposure.

#### Interactive media session recognition

An `RTCRtpReceiver` would be recognized as belonging to an **interactive media session** when all of the following entry conditions are true at the same time:

* The receiver's associated document is visible and focused.
* The receiver has a live video track, and has received and successfully decoded a video frame within the
  applicable time window.
* At least one of the following qualifying interaction conditions is true:
  * The document has a non-null [pointer-lock target](https://w3c.github.io/pointerlock/#dfn-pointer-lock-target).
  * [Keyboard lock](https://fullscreen.spec.whatwg.org/#keyboard-locking) is active for the document.
  * The user agent recently observed meaningful [gamepad](https://w3c.github.io/gamepad/) input associated with the document.
  * The document's [fullscreen element](https://fullscreen.spec.whatwg.org/#fullscreen-element) is not null, and the user agent recently observed keyboard, pointer, touch, or meaningful gamepad input directed at the document.


Recognition would be specific to one receiver. Activity on one receiver would not recognize another receiver as belonging to an interactive media session.

Once established, recognition would persist until the receiver's video track ends, its associated transceiver is stopped, its peer connection is closed, its document navigates or is discarded, or it stops receiving and decoding video for a sustained session-termination period. The document becoming hidden or losing focus, an interaction lock ending, or a recent-input window expiring would not by itself end recognition.

#### Active interactive media state

A receiver would be in the **active interactive media state** while all of the following are true:

* The receiver is recognized as belonging to an interactive media session.
* The receiver's associated document is visible and focused.
* The receiver has a live video track and has received and successfully decoded a video frame within the applicable time window.

Hardware exposure through the receiver-specific condition would be suspended when any condition becomes false. If the user temporarily switches tabs or applications, the receiver would remain recognized as part of the same interactive media session, but protected decoder information would not be exposed while its document is hidden or unfocused. Exposure could resume automatically when the user returns and the receiver is again actively decoding, without requiring another pointer lock, keyboard lock, fullscreen interaction, or gamepad input.

The time windows used for recent frame decoding, recent input, and session termination remain to be defined. They should tolerate ordinary network jitter, temporary interruptions, and pauses in user input without allowing recognition or exposure to persist after the interactive session has ended.

Conceptually, the WebRTC Stats algorithm would be updated as follows:

> To check if hardware exposure is allowed, given an optional `RTCRtpReceiver` *receiver*, run the following steps:
>
> 1. If the context capturing state is true, return true.
> 2. If *receiver* was given and *receiver* is in the active interactive media state, return true.
> 3. Otherwise return false.

The relevant receiver would be supplied when checking whether to expose `decoderImplementation` or `powerEfficientDecoder` for that receiver, or whether to dispatch a decoder-implementation-change event. No receiver would be supplied when checking outbound statistics, including [`encoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcoutboundrtpstreamstats-encoderimplementation), [`powerEfficientEncoder`](https://w3c.github.io/webrtc-stats/#dom-rtcoutboundrtpstreamstats-powerefficientencoder), [`psnrSum`](https://w3c.github.io/webrtc-stats/#dom-rtcoutboundrtpstreamstats-psnrsum), and [`psnrMeasurements`](https://w3c.github.io/webrtc-stats/#dom-rtcoutboundrtpstreamstats-psnrmeasurements). Those fields would therefore remain available only when the context capturing state is true. Future callers would likewise receive the existing behavior unless they explicitly supply a receiver.

#### Eligibility transitions

If the receiver leaves the active interactive media state, protected decoder statistics would no longer be exposed and decoder-implementation-change events would be suppressed. This suspension would not clear the receiver's interactive media session recognition.

If the receiver later reenters the active interactive media state and its current decoder implementation differs from the last implementation exposed to the application, the receiver would fire one coalesced `decoderstatechange` reflecting the current observable state. Intermediate changes while exposure was suspended would not be replayed. The event would use the `rtpTimestamp` of a frame decoded after exposure resumes rather than reveal when a hidden transition occurred.

## Alternatives Considered
1. Use [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) info via WebRTC Stats API
    * Rejected because it now requires [`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) permissions, which are invasive and have a high failure rate.
2. Use [`MediaCapabilitiesInfo.powerEfficient`](https://www.w3.org/TR/media-capabilities/#media-capabilities-info)
    * Rejected because this is a static hint that does not update when the browser silently switches from hardware to software decoding.
3. Guess based on decode times
    * Unreliable and has masked bugs in production.
4. [Add `decoderFallback` field to `RTCInboundRtpStreamStats`](https://github.com/w3c/webrtc-stats/pull/725)
    * Rejected because relying on stats to trigger a change felt like an anti-pattern and the recommendation was to explore an event driven solution. Additionally, there were concerns around fingerprinting.
    * [WebRTC March 2023 meeting – 21 March 2023](https://www.w3.org/2023/03/21-webrtc-minutes.html)

## Privacy Considerations

### Event exposure

The events carry only the media frame's `rtpTimestamp` and expose no hardware vendor, device identity, or decoder implementation detail.

* **`decoderstatechange`** distinguishes between information classes. Codec changes are reflected in ungated stats, so codec-change events are ungated. Decoder implementation changes can reveal hardware use and therefore fire only while hardware exposure is allowed. The protected [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) statistics are available under that same condition.
* **`decodererror`** is ungated and exposes a single [`EncodingError`](https://webidl.spec.whatwg.org/#encodingerror) [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) `name`, with no decoder-, driver-, or device-specific detail in its `message`. The decode failure it reports is already observable through ungated statistics: [`framesReceived`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-framesreceived) keeps advancing while [`framesDecoded`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-framesdecoded) stalls, and [`freezeCount`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-freezecount) rises. Codec support is likewise already queryable via [`getCapabilities()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/getCapabilities_static). The event surfaces the failure sooner and more precisely than polling, but the underlying information is already available, so it does not increase the fingerprinting surface.

### Hardware-exposure safeguards

The proposed `decoderstatechange` event for decoder implementation changes and the protected decoder statistics would invoke the hardware-exposure check with the relevant receiver. Outbound statistics would invoke the same check without a receiver. This keeps one hardware-exposure algorithm while ensuring that active interactive media state can allow only receiver-related exposure.

Interactive media session recognition is scoped to a specific receiver and requires active video decoding in a visible, focused document together with a qualifying indication of user interaction. Recognition alone does not expose protected information. Receiver-specific exposure remains limited to periods when the recognized receiver is actively decoding and its document is visible and focused. This allows temporary focus or visibility changes without requiring the user to reestablish the session, while preventing background observation of decoder state. The additional condition does not unlock protected outbound statistics, whose exposure remains tied to context capturing state.

### Relationship to MediaCapabilities

[`MediaCapabilitiesInfo.powerEfficient`](https://www.w3.org/TR/media-capabilities/#dom-mediacapabilitiesinfo-powerefficient) can expose whether a hypothetical configuration is expected to be power efficient without requiring active capture. The protected WebRTC statistics differ because they describe the actual decoder and can change during a session, potentially revealing contention for shared hardware resources across tabs or applications. Requiring an active receiver, a foreground document, and ongoing user interaction limits this additional exposure to contexts that need the live operational signal.

## Open Questions

* **Timing windows:** How long should recent decoded frames and recent input continue to qualify? The values must avoid eligibility flicker during normal streaming while promptly suspending exposure when active decoding stops.
* **Session lifetime:** How long may a recognized receiver stop receiving or decoding video before its interactive media session recognition ends? The period should tolerate temporary network interruptions without allowing a site to preserve recognition indefinitely.
* **Meaningful gamepad input:** What button, trigger, or axis thresholds distinguish intentional input from connection events, polling noise, and stick drift?
* **Embedded contexts:** Which document's visibility, focus, fullscreen, locks, and input should be considered when the receiver belongs to an iframe? Should cross-origin use require explicit delegation through Permissions Policy?
* **Information scope:** Should the interactive allowance expose both `decoderImplementation` and `powerEfficientDecoder`, or only the lower-entropy efficiency signal and corresponding state-change event?

## Stakeholder Feedback
* Web Developers: Positive
    * [Xbox Cloud Gaming](https://github.com/w3c/webrtc-stats/pull/725#discussion_r1093134014) & Nvidia GeForce Now have direct use cases.
* Chromium: Positive; actively pursuing proposal.
* WebKit & Gecko: Overall positive feedback, but privacy/fingerprinting is a common concern.

Last discussed in the 2025-11-13 Media WG Meeting (TPAC): [Slides 110-117](https://docs.google.com/presentation/d/1sd5zEnvlXO5Sk3ENQorUUIQiRz65sv0KZKxDMMYHM3I/edit?slide=id.g37005de94ba_0_154#slide=id.g37005de94ba_0_154) & [minutes](https://www.w3.org/2025/11/13-mediawg-minutes.html#6fa5)

## References & Acknowledgements
Many thanks for valuable feedback and advice from:
* [Nic Champagne Williamson](https://github.com/champnic)
* [Gabriel Brito](https://github.com/gabrielsanbrito)
* [Henrik Boström](https://github.com/henbos)
* [Sun Shin](https://github.com/xingri)

Links to past working group meetings where this has been discussed:
* 2025-11-13 Media WG Meeting (TPAC): [Slides 110-117](https://docs.google.com/presentation/d/1sd5zEnvlXO5Sk3ENQorUUIQiRz65sv0KZKxDMMYHM3I/edit?slide=id.g37005de94ba_0_154#slide=id.g37005de94ba_0_154) & [minutes](https://www.w3.org/2025/11/13-mediawg-minutes.html#6fa5)
* 2025-09-16 WebRTC WG Call: [Slides 17-21](https://docs.google.com/presentation/d/11rr8X4aOao1AmvyoDLX8o9CPCmnDHkWGRM3nB4Q_104/edit?slide=id.g37afa1cfe47_0_26#slide=id.g37afa1cfe47_0_26) & [minutes](https://www.w3.org/2025/09/16-webrtc-minutes.html)
* 2023-09-15 WebRTC WG Call: [Slides 25-31](https://docs.google.com/presentation/d/1FpCAlxvRuC0e52JrthMkx-ILklB5eHszbk8D3FIuSZ0/edit?slide=id.g2452ff65d17_0_71#slide=id.g2452ff65d17_0_71) & [minutes](https://www.w3.org/2023/09/15-webrtc-minutes.html)
* 2023-03-21 WebRTC WG Call: [Slides 16-18](https://lists.w3.org/Archives/Public/www-archive/2023Mar/att-0004/WEBRTCWG-2023-03-21.pdf) & [minutes](https://www.w3.org/2023/03/21-webrtc-minutes.html)
