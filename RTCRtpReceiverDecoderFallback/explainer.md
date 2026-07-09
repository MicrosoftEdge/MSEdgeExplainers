# RTCRtpReceiver Decoder State Changed and Error Events

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
Game streaming platforms like Xbox Cloud Gaming and Nvidia GeForce Now rely on hardware decoding in browsers to deliver low-latency, power-efficient experiences. During a stream, the decoder's state can change. The codec can be renegotiated, the receiver can fall back from hardware to software decoding, or the decoder can fail outright. Applications have no event-driven way to observe these changes and failures as they occur. The existing statistics must be polled and terminal decoder errors are not surfaced at all.

This proposal introduces two events on the receiver. The `decoderstatechange` event fires when the decoder's state changes. Codec changes always fire it. Hardware-to-software decoder changes fire it only while the application is capturing. In that state, the [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) statistics are already available. The `decodererror` event fires when the decoder hits a terminal error. Together they replace inefficient polling without exposing additional fingerprinting surface.

## User-Facing Problem
When the decoder fails terminally, playback freezes. The failure is not surfaced to the application, so there is no direct signal that decoding has stopped. The decoder's state can also change during a stream, for example when the codec is renegotiated. There is no event for these changes either. The only way to observe decoder state today is to poll [`getStats()`](https://w3c.github.io/webrtc-pc/#dom-rtcrtpreceiver-getstats) repeatedly, which is inefficient.

A related concern is decoder fallback. When the receiver falls back from a hardware to a software decoder, end users may experience increased latency, degraded quality, and battery drain. Developers would like to detect this in real time. They previously relied on the [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) statistic. As of Chromium M110+, it is only available while the application is capturing camera or microphone input. This proposal does not change that gating. For applications that are already capturing, it surfaces the fallback through an event instead of requiring polling. That capture-based gate fits real-time communication but not cloud gaming, another use case where low latency is essential to the user experience. A future extension could broaden the gating for `decoderImplementation` and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) to include signals typical of a cloud gaming session, such as gamepad input, keyboard lock, pointer lock, or fullscreen.

## Goals
* Enable developers to detect codec changes and decoder errors at runtime without requiring additional permissions like `getUserMedia()`.
* Allow applications to diagnose regressions (e.g. codec negotiation issues, device specific problems).
* Support user experience improvements by enabling apps to adapt (e.g. lowering resolution, re-negotiating codecs), alert end users to decoder errors, and display troubleshooting information.

## Non-goals
* Exposing vendor-specific hardware information.
* Exposing deterministic codec support/capabilities beyond what [`MediaCapabilities`](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capabilities_API) already provides.
* Providing detailed telemetry such as frame-level error counts or decoder identifiers.
* Adding a new, unpermissioned path to power-efficiency or hardware-versus-software decode status. These remain available only through the [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) stats, which `getStats()` exposes only when [exposing hardware is allowed](https://w3c.github.io/webrtc-stats/#dfn-exposing-hardware-is-allowed).

## User Research
Feedback from Xbox Cloud Gaming, Nvidia GeForce Now and similar partners shows:
* Decoder changes (e.g. fallback from hardware to software decoding) are common in the field. Developers lack visibility into when/why they occur.
* Reliance on `getUserMedia()` to query `decoderImplementation` has a high failure rate because users often deny permissions that are irrelevant to media playback.
* Previous workarounds (e.g. guessing based on decode times) have proven unreliable and masked bugs.
* Relying on `MediaCapabilities` is insufficient because it only provides a static capability hint and does not reflect runtime decoder changes, e.g. a fallback from hardware to software decoding.
* Without these signals, developers cannot reliably detect decoder changes or diagnose errors as they occur.

## Proposed Approach
Introduce two events on [`RTCRtpReceiver`](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver):

* A **`decoderstatechange`** event that fires when the receiver's decoder state changes, for example a codec change or a hardware-to-software fallback. The event carries only the media frame's `rtpTimestamp`. Applications can read what changed through the receiver's [`getStats()`](https://w3c.github.io/webrtc-pc/#dom-rtcrtpreceiver-getstats). See [Event triggers](#event-triggers) for details.
* A **`decodererror`** event that fires when the decoder encounters a terminal, unrecoverable failure, for example when hardware decoding fails and no software decoder is available for a negotiated codec such as H.265. Following [`SensorErrorEvent`](https://w3c.github.io/sensors/#sensorerrorevent) and [WebCodecs](https://w3c.github.io/webcodecs/#dom-videodecoderinit-error), the failure is surfaced as a [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException). Its [`name`](https://webidl.spec.whatwg.org/#dom-domexception-name) is [`EncodingError`](https://webidl.spec.whatwg.org/#encodingerror).

Codec changes and decoder errors are surfaced without requiring [`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) permissions. The `decodererror` event is coarse, carrying no decoder- or device-specific detail. Changes that reveal hardware-versus-software decoding are surfaced only when [exposing hardware is allowed](https://w3c.github.io/webrtc-stats/#dfn-exposing-hardware-is-allowed). This condition already gates the existing [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) stats, so the event reveals nothing the page cannot already read (see [Privacy Considerations](#privacy-considerations)). This enables applications to alert users, re-negotiate codecs, and debug issues at runtime.

### Event triggers

Two changes trigger the `decoderstatechange` event:

* **The codec changes.** The receive codec is switched or renegotiated. Applications can read the new codec from the [`RTCCodecStats`](https://w3c.github.io/webrtc-stats/#codec-dict%2A) referenced by the inbound-rtp report's `codecId`.
* **The decoder implementation changes.** For example, the receiver falls back from a hardware decoder to a software decoder. Applications can read [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder) from the inbound-rtp report. `getStats()` exposes these fields only when [exposing hardware is allowed](https://w3c.github.io/webrtc-stats/#dfn-exposing-hardware-is-allowed), so the event fires for this case under that same condition (see [Privacy Considerations](#privacy-considerations)).

The `decodererror` event fires when the decoder hits a terminal, unrecoverable failure, for example when hardware decoding fails and no software decoder is available for the negotiated codec (such as H.265). The failure is surfaced as an [`EncodingError`](https://webidl.spec.whatwg.org/#encodingerror) [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException). When a fallback succeeds (a software decoder is available), the receiver keeps decoding and may fire `decoderstatechange` instead, subject to the gating above.

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

        // decoderImplementation and powerEfficientDecoder are permission-gated.
        // They are only present when the web app is actively capturing
        // microphone or camera input. Apps that already hold the permission can
        // still read them here.
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

The events carry only the media frame's `rtpTimestamp`. They expose no hardware vendor, device identity, or decoder detail. Applications can read decoder state through [`getStats()`](https://w3c.github.io/webrtc-pc/#dom-rtcrtpreceiver-getstats), which applies its existing privacy protections.

* **`decoderstatechange`** follows the same gating as the stats that reflect the change. Codec changes are reflected in ungated stats, so the event fires regardless of capture state. Decoder implementation changes (such as a hardware-to-software fallback) are reflected only in [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) and [`powerEfficientDecoder`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-powerefficientdecoder), which `getStats()` exposes only when [exposing hardware is allowed](https://w3c.github.io/webrtc-stats/#dfn-exposing-hardware-is-allowed). It therefore reveals nothing the page cannot already read.
* **`decodererror`** exposes a single [`EncodingError`](https://webidl.spec.whatwg.org/#encodingerror) [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) `name`, with no decoder-, driver-, or device-specific detail in its `message`. The decode failure it reports is already observable through ungated statistics: [`framesReceived`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-framesreceived) keeps advancing while [`framesDecoded`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-framesdecoded) stalls, and [`freezeCount`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-freezecount) rises. Codec support is likewise already queryable via [`getCapabilities()`](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/getCapabilities_static). The event surfaces the failure sooner and more precisely than polling, but the underlying information is already available, so it does not increase the fingerprinting surface.

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

