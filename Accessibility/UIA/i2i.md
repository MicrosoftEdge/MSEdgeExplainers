# Intent to Implement and Ship: UIAutomation Provider Mappings

## Contact emails

Rossen.Atanassov@microsoft.com, Melanie.Richards@microsoft.com

## Explainer

[UI Automation Explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/UIA/explainer.md)

## Design doc/Spec

[UI Automation Providers Overview](https://docs.microsoft.com/en-us/windows/desktop/winauto/uiauto-providersoverview)

A TAG review is not requested, as these interfaces are specific to the Windows platform and not intended to be introduced as web standards. It is not expected that web developers will need to make changes to their content as a result of this work, as UIAutomation support reflects lower-level implementation details, and will not be replacing or removing accessibility APIs already supported in Chromium.

## Summary

Microsoft UI Automation (UIA) provides programmatic access to most user interface (UI) elements of desktop applications, as well as web content and web applications. This API enables assistive technology (AT) products, such as screen readers, to provide information about applications, their UI and contents to end users. With this information ATs can allow user to manipulate applications by means other than standard input.

At a high level, UIA achieves its functionality by exposing two sets of APIs, *provider APIs*, those implemented by a web browser for example, and *client APIs*, those implemented by an AT. This document’s focus is on implementing the *provider* APIs inside Chromium. These APIs are not exposed to web developers, and it is not expected that web developers should change the way they build sites and web apps—these APIs are meant to map web content into a format useful to C/C++ programmers.

## Motivation

A UIA implementation benefits the browser/web platform, AT clients, and ultimately the end user.
By supporting UIA, Chromium-based browsers can:

* Ensure that their platform is available to users who choose to browse with UIA-powered ATs, such as Narrator.
* Provide accessibility mappings in a secure fashion.
* Take advantage of the official Windows accessibility API.

With UIA, ATs can enhance web browsing for their users in Chromium-based browsers. ATs can:

* Innovate on top of rich text-level interaction and smooth reading experiences.
* Spend less time writing to different accessibility APIs, and more time on core capabilities.
* Take advantage of a continually-evolving platform, and the performance gains and extended capabilities that come along with it.

For extended background on motivations, please refer to the [explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/UIA/explainer.md).

## Risks

### Interoperability and Compatibility

**Interoperability risk:** This work has no impact to the core web platform exposed to JavaScript developers. As such the risk of introducing interoperability gaps in the web layer is low to none.

A UIA implementation has no bearing on browser support for any other assistive technology platform APIs, such as MSAA and IA2, as these APIs are distinct from UIA. While interoperable support would be ideal for primarily-UIA-based AT experiences, other browsers are free to choose to support other accessibility APIs, in addition to or instead of UIA.

* Edge: Shipped
* Chrome: In progress
* Firefox: No signals
* Safari: N/A
* Web / Framework developers: N/A

**Compatibility risk:** same as Interoperability risk

### Ergonomics

UIA doesn’t pose any specific performance concerns that aren’t applicable to any other assistive API, such as IA2.

In order to extend UIA support from basic to full coverage, this work will continue to leverage Chromium’s platform-agnostic accessibility tree abstraction layer, and will map tree elements to the appropriate UIA control types. Support of UIA interfaces will be consistent with other UIA providers, as outlined in [UI Automation Providers Overview](https://docs.microsoft.com/en-us/windows/desktop/winauto/uiauto-providersoverview). For an overview of how web content semantics will map to UIA, refer to the following mapping specifications: [Core-AAM](https://w3c.github.io/core-aam/), [HTML-AAM](https://w3c.github.io/html-aam/), [Graphics-AAM](https://w3c.github.io/graphics-aam/), and [SVG-AAM](https://w3c.github.io/svg-aam/).

### Activation

Since the feature isn’t exposed to the web API layer, it has no bearing to web developers nor is it expected to pose any challenges or additional requirements to them.

In Chromium today, accessibility API code is activated only when ATs are attached, or the user has specified via [browsername]://accessibility that the browser should be run in accessibility mode.

## Debuggability

UIA is implemented and debugged at the browser layer, thus is not intended to be exposed to DevTools. At the same time, it is useful to allow web developers to observe the information provided to UIA–the control types, properties and supported patterns. Since DevTools support isn’t critical to this feature, it can be considered TBD. However, it is reasonable to expect that these DevTools will be similar to representations found cross-browser today:

* A representation of the current document’s accessibility tree
* A list of key-value pairs for the computed accessibility mappings of the currently-inspected node

## Will this feature be supported on all six Blink platforms (Windows, Mac, Linux, Chrome OS, Android, and Android WebView)?

No. UIAutomation provider APIs are specific to Windows and will only be supported on Windows 7+ platforms.

## Is this feature fully tested by [web-platform-tests](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_platform_tests.md)?

This feature is not a web standard, but mappings from ARIA and host language semantics into UIA can be tested. The relevant test suites include:

* [CORE-AAM-1.1](https://github.com/w3c/test-results/tree/gh-pages/core-aam-1.1)
* [CORE-AAM-1.2](https://github.com/w3c/test-results/tree/gh-pages/core-aam-1.2)
* [GRAPHICS-AAM](https://github.com/w3c/test-results/tree/gh-pages/graphics-aam)

## Link to entry on the feature dashboard

<TBD>

## Requesting approval to ship?

Yes
