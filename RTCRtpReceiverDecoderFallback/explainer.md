# RTCRtpReceiver Decoder Events

**Authors**
* [Nishitha Burman Dey](https://github.com/nishitha-burman)
* [Steve Becker](https://github.com/SteveBeckerMSFT)
* [Diego Perez Botero](https://github.com/Diego-Perez-Botero)
* [Philipp Hancke](https://github.com/fippo)
* [Rahul Singh](https://github.com/rahulsingh-msft)

Much of this explainer synthesizes and consolidates prior discussions and contributions from members of the WebRTC working group.

## Participate
* [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/RTCRtpReceiverDecoderFallback)
* [Discussion forum](https://github.com/w3c/webrtc-extensions/issues/146)

## Introduction
Game streaming platforms like Xbox Cloud Gaming and Nvidia GeForce Now rely on hardware decoding in browsers to deliver low-latency, power efficient experiences. However, currently there is no reliable way for these applications to detect decoder state changes during a stream, for example a silent fallback from hardware to software decoding.

This proposal introduces two events: `decoderstatechange`, fired when the decoder's state changes, and `decodererror`, fired when the decoder encounters an error. The goal is to give developers actionable visibility into runtime behavior without exposing new fingerprinting vectors or hardware details.

## User-Facing Problem
End users of game streaming services may experience increased latency, degraded quality, and battery drain when certain decoder changes occur, for example a fallback from hardware to software decoding. Developers currently lack a way to detect these changes in real time without prompting users for camera/mic permissions. Previously, they relied on [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) info, but as of Chromium M110+ it requires [`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) permissions, which is not ideal. The permission prompt is invasive and excessive. It requires granting access to camera and mic hardware that apps may not need. It also has a high failure rate because users have little reason to grant this permission for use cases unrelated to voice or video capture. This gap makes it difficult to diagnose performance regressions and provide troubleshooting guidance.

## Goals
* Enable developers to detect decoder state changes and decoder errors at runtime in a non-invasive way, without requiring additional permissions like `getUserMedia()`.
* Allow applications to diagnose regressions (e.g. codec negotiation issues, device specific problems).
* Support user experience improvements by enabling apps to adapt (e.g. lowering resolution, re-negotiating codecs), alert end users to decoder errors, and display troubleshooting information.

## Non-goals
* Exposing vendor-specific hardware information.
* Exposing deterministic codec support/capabilities beyond what [`MediaCapabilities`](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capabilities_API) already provides.
* Providing detailed telemetry such as frame-level error counts or decoder identifiers.
* Adding a new, unpermissioned path to power-efficiency or hardware-vs-software decode status. Developers still access it through the capture-gated [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) stat.

## User Research
Feedback from Xbox Cloud Gaming, Nvidia GeForce Now and similar partners shows:
* Decoder changes (e.g. fallback from hardware to software decoding) are common in the field. Developers lack visibility into when/why they occur.
* Reliance on `getUserMedia()` to query `decoderImplementation` has a high failure rate because users often deny permissions that are irrelevant to media playback.
* Previous workarounds (e.g. guessing based on decode times) have proven unreliable and masked bugs.
* Relying on `MediaCapabilities` is insufficient because it only provides a static capability hint and does not reflect runtime decoder changes, e.g. a fallback from hardware to software decoding.
* Without these signals, developers cannot detect decoder changes or diagnose errors as they occur.

## Proposed Approach
Introduce two events on [`RTCRtpReceiver`](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver):

* A **`decoderstatechange`** event that fires whenever the receiver's decoder state changes. The event carries the media frame's `rtpTimestamp`. Applications access the currently used codec's [`RTCCodecStats`](https://w3c.github.io/webrtc-stats/#codec-dict%2A) through the receiver's [`getStats()`](https://w3c.github.io/webrtc-pc/#dom-rtcrtpreceiver-getstats).
* A **`decodererror`** event that fires when the decoder encounters an error, for example when no decoder is available for a negotiated codec such as H.265. Following [`SensorErrorEvent`](https://w3c.github.io/sensors/#sensorerrorevent) and [WebCodecs](https://w3c.github.io/webcodecs/#dom-videodecoderinit-error), the error is exposed as a [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) whose `name` identifies the error.

Both events fire without requiring [`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) permissions, enabling applications to alert users, re-negotiate codecs, and debug issues at runtime.

### Proposed IDL

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
**Note:** The `decoderstatechange` event fires at the start of streaming and on each subsequent decoder state change.

### Example

```JavaScript
const pc = new RTCPeerConnection();

pc.addEventListener('track', (event) => {
  const receiver = event.receiver;

  // The change event fires whenever the receiver's decoder state changes.
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

        // decoderImplementation is permission-gated. It is only present when
        // the page holds an active capture permission (e.g. from getUserMedia).
        // Apps that already hold the permission can still read it here.
        if (report.decoderImplementation) {
          logMetric(`Decoder implementation: ${report.decoderImplementation}`);
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

## Alternatives Considered
1. Use [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) info via WebRTC Stats API
    * Rejected because it now requires [`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) permissions, which are invasive and have a high failure rate.
    * Requires unnecessary permissions (camera/microphone).
2.	Guess based on decode times
    * Unreliable and has masked bugs in production.
3.	[Add `decoderFallback` field to `RTCInboundRtpStreamStats`](https://github.com/w3c/webrtc-stats/pull/725)
    * Rejected because relying on stats to trigger a change felt like an anti-pattern and the recommendation was to explore an event driven solution. Additionally, there were concerns around fingerprinting.
    * [WebRTC March 2023 meeting – 21 March 2023](https://www.w3.org/2023/03/21-webrtc-minutes.html)

## Privacy Considerations
* The events do not expose hardware vendor or device identity, reducing fingerprinting risk.
* They do not reveal deterministic codec/hardware support.
* The events expose no new information. The `decodererror` event mirrors the error callback in [WebCodecs](https://w3c.github.io/webcodecs/#dom-videodecoderinit-error), surfacing a [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) when a decoder error occurs.

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

