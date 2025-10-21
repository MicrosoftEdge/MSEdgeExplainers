# Decoder Error

**Authors**
* [Nishitha Burman Dey](https://github.com/nishitha-burman)
* [Steve Becker](https://github.com/SteveBeckerMSFT)
* [Diego Perez Botero](https://github.com/Diego-Perez-Botero)
* [Philipp Hancke](https://github.com/fippo)

Much of this explainer synthesizes and consolidates prior discussions and contributions from members of the WebRTC working group.

## Participate
* [Issue tracker](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/DecoderError)
* [Discussion forum](https://github.com/w3c/webrtc-extensions/issues/146)

## Introduction
Game streaming platforms like Xbox Cloud Gaming and Nvidia GeForce Now rely on hardware decoding in browsers to deliver low-latency, power efficient experiences. However, there is currently no reliable way for these applications to detect when decoding silently falls back to software during a stream. 

This proposal introduces a runtime event to notify applications when a decoder error or fallback occurs. The goal is to give developers actionable visibility into runtime behavior without exposing new fingerprinting vectors or hardware details.

## User-Facing Problem
End users of game streaming services may experience increased latency, degraded quality, and battery drain when the browser switches from hardware to software decoding. Developers currently lack a way to detect this fallback in real time without prompting users for camera/mic permissions. In the past, developers used to rely on [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) info, but as of Chromium M110+ it requires [`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) permissions. This is not ideal because the UI prompt is invasive, it’s excessive since it grants access to the camera and mic hardware when apps don’t need it, and it has a high failure rate since users have little reason to grant the permission unless they want to use voice chat. This gap makes it difficult to diagnose performance regressions and provide troubleshooting guidance.  

## Goals
* Enable developers to detect runtime decoder fallback from hardware to software in a non-invasive way without requiring additional permissions (does not require `getUserMedia()` permissions).
* Allow applications to diagnose regressions (e.g. codec negotiation issues, device specific problems).
* Support user experience improvements by enabling apps to adapt (e.g. lowering resolution, re-negotiating codecs), alerting end users when software decode occurs, and displaying troubleshooting information. 

## Non-goals
* Exposing vendor-specific hardware information.
* Exposing deterministic codec support/capabilities beyond what [`MediaCapabilities`](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capabilities_API) already provides.
* Providing detailed telemetry such as frame-level error counts or decoder identifiers. 

## User Research
Feedback from Xbox Cloud Gaming, Nvidia GeForce Now and similar partners shows:
* Fallback is common in the field, and developers lack visibility into when/why it occurs. 
* Reliance on `getUserMedia()` to query `decoderImplementation` has a high failure rate because users often deny permissions that are irrelevant to media playback. 
* Previous workarounds (e.g. guessing based on decode times) have proven unreliable and masked bugs. 
* Relying on `MediaCapabilities` is insufficient because it only provides a static capability hint and does not reflect what happens at runtime, for example, when hardware decode fails mid-session and the browser silently falls back to software. 
* Without this signal, developers cannot confidently diagnose or reduce fallback incidence. 

## Proposed Approach
Introduce an event on [`RTCRtpReceiver`](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver) ([see slide 30](https://docs.google.com/presentation/d/1FpCAlxvRuC0e52JrthMkx-ILklB5eHszbk8D3FIuSZ0/edit?slide=id.g2452ff65d17_0_71#slide=id.g2452ff65d17_0_71)) that fires when a decoder error occurs:
* The engine falls back from hardware to software decoding
* No software decoder is available (e.g. in the case of H.265)

This enables applications to alert users, re-negotiate codecs, and debug issues without requiring [`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) permissions.

### Example

```JavaScript
const pc = new RTCPeerConnection();

pc.addEventListener('track', (event) => {
  const receiver = event.receiver;

  // Listen for decoder state changes
  receiver.addEventListener('decoderstatechange', (ev) => {

    // Adapt application behavior based on power efficiency
    if (!ev.powerEfficient) {
        // Notify the user
        showToast("Playback quality may be reduced");

        // Lower resolution or disable heavy post-processing
        adjustQuality('low');

        // Log telemetry signal with codec and RTP timestamp
        logMetric(`Decoder fallback: codec=${ev.codecString}, rtp=${ev.rtpTimestamp}`);
    }
  });
});

```
### Proposed IDL

```JavaScript
partial interface RTCRtpReceiver {
attribute EventHandler ondecoderstatechange;
};

interface RTCDecoderStateChangeEvent : Event {
constructor(DOMString type, RTCDecoderStateChangeEventInit eventInitDict);

// Media timeline reference
readonly attribute unsigned long rtpTimestamp;

// Codec now in effect after the change.
readonly attribute DOMString codecString; 

// Align with MediaCapabilitiesInfo, powerEfficient changes primarily based on hardware/software decoder
// https://www.w3.org/TR/media-capabilities/#media-capabilities-info
readonly attribute boolean powerEfficient;
};
```
**Note:** The event fires at the beginning of streaming.

## Alternatives Considered
1. Use [`decoderImplementation`](https://w3c.github.io/webrtc-stats/#dom-rtcinboundrtpstreamstats-decoderimplementation) info via WebRTC Stats API
    * Rejected because it now requires [`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) permissions, which are invasive and have a high failure rate. 
    * Requires unnecessary permissions (camera/microphone).
2.	Use [`MediaCapabilitiesInfo.powerEfficient`](https://www.w3.org/TR/media-capabilities/#media-capabilities-info)
    * Rejected because this is a static hint, not a runtime signal.
    * Does not update when the browser silently switches from hardware to software.
3.	Guess based on decode times
    * Unreliable and has masked bugs in production.
4.	[Add `decoderFallback` field to `RTCInboundRtpStreamStats`](https://github.com/w3c/webrtc-stats/pull/725)
    * Rejected because relying on stats to trigger a change felt like an anti-pattern and the recommendation was to explore an event driven solution. Additionally, there were concerns around fingerprinting.
    * [WebRTC March 2023 meeting – 21 March 2023](https://www.w3.org/2023/03/21-webrtc-minutes.html)

## Privacy Considerations
* The event does not expose hardware vendor or device identity, reducing fingerprinting risk. 
* Does not reveal deterministic codec/hardware support.

### Counter-argument to fingerprinting concerns: 
* **Information is already exposed via Media Capabilities**: Hardware/software decode status is already partially exposed via the [`MediaCapabilitiesInfo.powerEfficient`](https://www.w3.org/TR/media-capabilities/#media-capabilities-info) attribute. A “common implementation strategy” is to treat hardware usage as indicative of optimal power draw.
* **Fallback doesn’t directly reveal capability**: The fallback event does not deterministically expose hardware support, as software fallback may occur for various reasons, making it a dynamic and contextual signal rather than a static fingerprint. Software fallback may occur because:
    * Device lacks hardware support for the specific codec. 
    * The hardware decoder is temporarily unavailable.

## Stakeholder Feedback
* Web Developers: Positive
    * [Xbox Cloud Gaming](https://github.com/w3c/webrtc-stats/pull/725#discussion_r1093134014) & Nvidia GeForce Now have direct use cases.
* Chromium: Positive; actively pursuing proposal.
* WebKit & Gecko: Overall positive feedback, but privacy/fingerprinting is a common concern. 

Last discussed in the 2025-09-16 WebRTC WG Call: [Slides 17-21](https://docs.google.com/presentation/d/11rr8X4aOao1AmvyoDLX8o9CPCmnDHkWGRM3nB4Q_104/edit?slide=id.g37afa1cfe47_0_26#slide=id.g37afa1cfe47_0_26) & [minutes](https://www.w3.org/2025/09/16-webrtc-minutes.html)

## References & Acknowledgements 
Many thanks for valuable feedback and advice from:
* [Nic Champagne Williamson](https://github.com/champnic)
* [Gabriel Brito](https://github.com/gabrielsanbrito)
* [Henrik Boström](https://github.com/henbos)
* [Sun Shin](https://github.com/xingri)

Links to past working group meetings where this has been discussed:
* 2025-09-16 WebRTC WG Call: [Slides 17-21](https://docs.google.com/presentation/d/11rr8X4aOao1AmvyoDLX8o9CPCmnDHkWGRM3nB4Q_104/edit?slide=id.g37afa1cfe47_0_26#slide=id.g37afa1cfe47_0_26) & [minutes](https://www.w3.org/2025/09/16-webrtc-minutes.html)
* 2023-09-15 WebRTC WG Call: [Slides 25-31](https://docs.google.com/presentation/d/1FpCAlxvRuC0e52JrthMkx-ILklB5eHszbk8D3FIuSZ0/edit?slide=id.g2452ff65d17_0_71#slide=id.g2452ff65d17_0_71) & minutes
* 2023-03-21 WebRTC WG Call: [Slides 16-18](https://lists.w3.org/Archives/Public/www-archive/2023Mar/att-0004/WEBRTCWG-2023-03-21.pdf) & [minutes](https://www.w3.org/2023/03/21-webrtc-minutes.html)

