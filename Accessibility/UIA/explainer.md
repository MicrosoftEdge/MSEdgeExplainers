# UI Automation Provider Mappings Explainer

Authors: [Rossen Atanassov](https://github.com/atanassov), [Melanie Richards](https://github.com/melanierichards)

## Introduction

[Microsoft UI Automation (UIA)](https://learn.microsoft.com/dotnet/framework/ui-automation/ui-automation-overview) provides programmatic access to most user interface (UI) elements of desktop applications, as well as web content and web applications. This API enables assistive technology (AT) products, such as screen readers, to provide information about applications, their UI and contents to end users. With this information, ATs can allow the user to manipulate applications by means other than standard input.

At a high level, UIA exposes two sets of APIs, *provider APIs*, those implemented by a web browser for example, and *client APIs*, those implemented by an AT. This document’s focus is on implementing the *provider* APIs inside Chromium. These APIs are not exposed to web developers, and it is not expected that web developers should change the way they build sites and web apps—these APIs are meant to map web content into a format useful to C/C++ programmers.

## Why is a UI Automation implementation needed?

A UIA implementation benefits the browser/web platform, AT clients, and ultimately the end user.

By supporting UIA, Chromium-based browsers can:

* **Ensure that their platform is available to users who choose to browse with UIA-powered ATs, such as Narrator.** While UIA provides proxies from other accessibility APIs—namely MSAA and in preview builds, IA2—these proxies are not as performant as native UIA support, and do not cover the full capabilities of native UIA interfaces. In order to provide the most enjoyable and performant experience for these AT users, full UIA support is recommended.
* **Provide accessibility mappings in a secure fashion.** As part of the Windows platform, UIA allows providers to expose robust information about their UI and contents to ATs, while insulating providers (the browser) from third-party AT code. UIA enables better process sandboxing and a stronger security model for the browser and its processes, ultimately keeping users more secure.
* **Take advantage of the official Windows accessibility API.** Cross-OS web platforms have the challenge of providing a consistently delightful user experience—while also leveraging the extra goodness each platform has to offer, such that the browser feels “at home” on the given operating system. Controls are presented in UIA in a consistent fashion from application to application, and so ATs can enable interactions in the browser that are natural alongside the rest of the OS ecosystem.

With UIA, ATs can enhance web browsing for their users in Chromium-based browsers. ATs can:

* **Innovate on top of rich text-level interaction and smooth reading experiences.** TextPattern is a UIA interface that was designed to allow interactivity and text reading at various levels of fidelity—characters, words, sentences, paragraphs, or even an entire document. Combine this with extensive information about text attributes, and ATs have a powerful set of text APIs with which to provide quite tailored functions for a great browsing experience.
* **Spend less time writing to different accessibility APIs, and more time on core capabilities.** When the same API is supported across an OS ecosystem, including the web platform, ATs do not need to implement per-application logic to account for differences in how content and controls are structured. This is a great benefit as it allows ATs to focus on providing innovative and performant experiences for any application, including the browser.
* **Take advantage of a continually-evolving platform.** As the official accessibility API of the Windows platform, UIA continually invests in performance gains and extensions to the API surface, based on AT vendor feedback. ATs can take advantage of this continued investment to likewise evolve their offerings.

At the heart of all this are users of assistive tech, who are empowered to browse the web with tools that are efficient, robust, and secure.

## High-level summary of provider APIs

In order to complete UI Automation support in Chromium, this project will implement the provider APIs for:

* **The [accessibility tree](https://learn.microsoft.com/windows/desktop/winauto/uiauto-eventsoverview) and [control types](https://learn.microsoft.com/windows/desktop/winauto/uiauto-controltypesoverview):** This work will leverage Chromium’s platform-agnostic accessibility tree abstraction layer, and map its elements to the appropriate UIA control types. For reference, in case of web applications, a control could be represented by one or more HTML elements, such as a `<a>` or `<select>` and its `<option>` elements.
* **[Properties](https://learn.microsoft.com/windows/desktop/winauto/uiauto-propertiesoverview):** mappings from ARIA and host language semantics into control properties. These can include what state the control is in, the control’s relationship to other controls, its styles, value, and placement, and many other useful properties (such as alternative text).
* **[Control patterns](https://learn.microsoft.com/windows/desktop/winauto/uiauto-controlpatternsoverview):** methods allowing interaction with controls, often with interaction models specific to their types. Many control patterns implement UI idioms such as "this element is toggle-able, here's a method to toggle it" or "this element accepts a range of values, here are the min/max/current values and a method for changing the current value." Some control patterns expose additional structural information, such as "this tree of nodes represents a table with rows and columns." TextPattern, as previously mentioned, is a robust control pattern which marks up text content with both structure and style information; it also enables linear navigation over text content.
* **[Events](https://learn.microsoft.com/windows/desktop/winauto/uiauto-eventsoverview):** notifications for structural and property changes of UI controls. Similarly to other accessibility APIs, UIA events inform ATs of changes which can be surfaced to end users.

## Example of control interfaces

For an example of how these APIs work in conjunction to provide complete interactivity with a control, refer to documentation for the [Button control type](https://learn.microsoft.com/windows/desktop/winauto/uiauto-supportbuttoncontroltype) (which `<button>` and elements with `role="button"` map into).

## Current workarounds

Providing UI and text information for the purposes of accessibility technologies is already possible today, even without UI Automation. Existing technologies such as MSAA and IA2 are examples of platform APIs that allow ATs to observe and interact with the browser and its web contents.

Implementing UI Automation support on the Windows platform is not intended to replace any existing platform API support, but to offer a mature and evolving API choice to assistive technologies and their users.

## Additional information

* For detailed information on UI Automation provider APIs, please refer to [UI Automation Providers Overview](https://learn.microsoft.com/windows/desktop/winauto/uiauto-providersoverview).
* Each accessibility API has its own nomenclature. For a quick sense of the differences between API mappings, refer to the tables in mapping specifications such as [Core-AAM](https://w3c.github.io/core-aam/), [HTML-AAM](https://w3c.github.io/html-aam/), [Graphics-AAM](https://w3c.github.io/graphics-aam/), and [SVG-AAM](https://w3c.github.io/svg-aam/).

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/UI%20Automation) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BUI%20Automation%5D)
