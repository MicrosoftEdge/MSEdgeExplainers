![Microsoft Edge Logo](https://avatars0.githubusercontent.com/u/11354582?s=100) 
# Microsoft Edge Explainers

Welcome! This repo is home to "explainers" and related documents originating 
from the Microsoft Edge team.

[Explainers](https://w3ctag.github.io/explainers) are documents focused on 
describing a user/ developer/ customer problem (at a high level) and exploring 
potential solutions. These documents are starting points for engaging in discussion 
with you and other members of the community. Explainers should address their 
stated problems in clear and easy to understand language. Proposed solutions
should be easy to follow and not too deep in technical details. When you read
an explainer, we hope the stated problem is compelling and you can form an 
opinion for whether the proposed solution would address the problem.

### Please provide feedback

We are looking for feedback! Are the stated problems actually real problems? 
How have they impacted your experience? Do the proposed solutions seem reasonable?
Do they follow good [web principles](https://w3ctag.github.io/design-principles/)?
Would they solve a problem you currently have? (We love to hear that; tell
us more about your scenario!) Do you have related use-cases we hadn't considered?

We appreciate you taking the time to offer feedback; it helps to improve the 
explainers, validate the problem and solutions they describe, and show evidence
that there is potential momentum to move an idea to the next stage--we desire
to see all our explainers make the journey to become cross-browser supported
web standards.

**[Start a new issue here](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new)**,
or [join in the discussion](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/)
on existing issues. We also welcome PRs on the explainer documents themselves. 
Note: we use labels to filter the issues to specific explainers.

### Have a product bug?

If you're looking to file a product bug on Microsoft Edge and the bug is unique
to Edge, please use the in-browser "Send Feedback" tool (Alt+Shift+i in Windows,
or "..." > "Help and feedback"). If the bug reproduces in another Chromium-based
browser, please file the issue upstream in the [Chromium bug database](https://bugs.chromium.org/p/chromium/).
Thanks!

# Active Explainers 📣

These are the proposals we are currently investigating in this repo. Use the
links below to read the explainers, review the current issues, and file new
issues specifically for the given explainer(s). We hope they will all "graduate"
and begin their journey along the standards-track as they gain sufficient interest;
each explainer should have a "Status of this Document" section that indicates 
what standards venue they expect to go to next (if known). When they graduate,
we will move them into the [Alumni section](#alumni-).

### Accessibility

* [ARIA Virtual Content Explainer](Accessibility/VirtualContent/explainer.md)

### Controls

* [Standardized Form Controls](https://github.com/WICG/form-controls-components)

### Editing

* [Highlight Events Explainer](highlight/events-explainer.md)
* [PenEvents Explainer](PenEvents/explainer.md) and [Design Doc](PenEvents/dev-design.md)
* [pen-action Explainer](PenAction/explainer.md)
* [Web Ink Enhancement Explainer](https://github.com/WICG/ink-enhancement/blob/master/README.md) ~~[archived initial explainer](WebInkEnhancement/explainer.md)~~
* [Virtual Keyboard API](VirtualKeyboardAPI/explainer.md)
* [Virtual Keyboard Policy](VirtualKeyboardPolicy/explainer.md)
  
### HTML

* [CSS Modules Explainer](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/css-modules-v1-explainer.md) ~~[archived initial explainer](CSSModules/v1Explainer.md)~~
* [HTML Modules Explainer](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md), ~~[archived initial explainer](HTMLModules/explainer.md)~~, and [intent-to-implement](HTMLModules/i2i.md)
* [JSON Modules intent-to-implement](https://groups.google.com/a/chromium.org/forum/#!topic/blink-dev/ojwkySW-bpQ)

### Media

* [Audio Stream Category](AudioStreamCategory/explainer.md)

### Privacy

* [Autofill Reauthentication](AutofillReauthentication/explainer.md)
* [Time-limited Permissions Explainer](TimeLimitedPermissions/Explainer.md)

### Progressive Web Applications

* [Run on OS Login Explainer](RunOnLogin/Explainer.md)
* [Cache API Response Metadata Explainer](CacheAPIResponseMetadata/explainer.md)
* [Install Time Permissions Prompt](InstallTimePermissionsPrompt/Explainer.md)
* [Title Bar Customization Explainer](TitleBarCustomization/explainer.md)
* [URL Protocol Handler Registration for PWAs Explainer](URLProtocolHandler/explainer.md)
* [Version History](VersionHistory/explainer.md)

### Storage

* [Storage Access API Explainer](StorageAccessAPI/explainer.md)

### UI

* [Window segments enumeration API Explainer](Foldables/explainer.md) | ![GitHub issues by-label](https://img.shields.io/github/issues/MicrosoftEdge/MSEdgeExplainers/Foldables) | File an issue...

### Web App Manifest

* [ImageResource `color_scheme` Explainer](ImageResource-color_scheme/explainer.md)

### WebDriver

* [Bidirectional WebDriver Protocol Explainer](WebDriverRPC/webdriver.md)

### Web Performance Measurement

* [Frame Timing Use Cases](FrameTiming/use_cases.md)

### 3D / Immersive Experiences
* [Native GLTF Pre-explainer](https://github.com/immersive-web/proposals/issues/52)


# Alumni 🎓

Awesome! These explainers have moved on to bigger and better things! We've 
archived the original explainers here for posterity and updated their document
status section to help you find where the latest discussions are happening.
Please continue to participate and follow the links below to the current
standards communities. Thanks for your interest!

| Archived Explainer | Category | Document in Current Venue |
|--|--|--|
| [EditContext API](EditContext/explainer.md) | Editing | [EditContext API Explainer](https://github.com/w3c/editing/blob/gh-pages/ActiveDocuments/EditContext/explainer.md) in the [W3C Editing Task Force](https://w3c.github.io/editing/) |
| [High Contrast](Accessibility/HighContrast/explainer.md) | Accessibility | [System Colors section](https://drafts.csswg.org/css-color/#css-system-colors) of [CSS Color Module Level 4](https://drafts.csswg.org/css-color/),<br> ['forced-color-adjust'](https://drafts.csswg.org/css-color-adjust-1/#forced) of [CSS Color Adjustment Module Level 1](https://drafts.csswg.org/css-color-adjust-1/), and<br> ['forced-colors'](https://drafts.csswg.org/mediaqueries-5/#forced-colors) of [Media Queries Level 5](https://drafts.csswg.org/mediaqueries-5/) in the [W3C CSS Working Group](https://www.w3.org/Style/CSS/) |
| [Highlight API](highlight/explainer.md) | Editing | [CSS Custom Highlight API Module Level 1](https://drafts.csswg.org/css-highlight-api-1/) in the [W3C CSS Working Group](https://www.w3.org/Style/CSS/) |
| [Media Blob](MediaBlob/explainer.md) | Media | [Improved Client-side Video Editing Explainer](https://github.com/WICG/video-editing/blob/master/readme.md) in the [Web Incubator Community Group](https://wicg.io/) |
| [Shortcuts](Shortcuts/explainer.md) | Progressive Web Applications | ['shortcuts' member](https://w3c.github.io/manifest/#shortcuts-member) of [Web App Manifest](https://w3c.github.io/manifest/) in the [W3C Web Applications Working Group](https://www.w3.org/2019/webapps/) |


# DevTools 🧰
We love our developer tools! Checkout these cool innovations being designed for the developer tools:

* [3D View]( https://docs.google.com/document/d/16xsQbr1YjjuoxHJlCsAaIzK-s4Ogd6fEuhrSajdVivA)
* [CSS Grid Tooling](https://docs.google.com/document/d/1s0AkeMOtlwqD74GJZtedxqOnttQtgj9oo8RjfVyaHP8/)
* [Customizable Keyboard Shortcuts](https://docs.google.com/document/d/1oOPSWPxCHvMoBZ0Fw9jwFZt6gP4lrsrsl8DEAp-Hy7o/)
* [DevTools Infobar UI Refresh](https://docs.google.com/document/d/1GjpfPkdljH97IAaWfY8d9NBim1wrPPRaD8zMl8PWhLs/)
* [Dual-screen Emulation](https://docs.google.com/document/d/1KMsmEXdjmn4h4iIl0n74N1EHxwwNUzh6R2p7GHrdtTI)
* [High Contrast Simulation](https://docs.google.com/document/d/1SUx-hfodUUMAIwmcwIVYlpi9YDrLnkwW0T7yXUN8s50/)
* [Localization of the DevTools](https://docs.google.com/document/d/1L6TkT2-42MMQ72ZSBMFwUaq7M6mDgA2X0x8oHHKaV_U/)
* [Redux for State](https://docs.google.com/document/d/1yVI-ABz_PL5npfoNosvv1ZKOsXhUwSMKc30UHf2RyqM/)
* [Settings Discoverability and Telemetry](https://docs.google.com/document/d/1n9AGuh0iWQoqgm749BJJELK-ckrkgnaB5jfgef9RWSA/)
* [Stackable Overlays](https://docs.google.com/document/d/13MHkk0rgHJl_MAIgrouUef5k9fK7lZMI1IEiNIUKbD0/)


# Other Documents

A collection of explainers documenting platform enhancements (not web 
developer-facing features), implementation designs, and other public documents
related to the construction of Microsoft Edge.

### Acessibility

* [Native Caret Browsing](Accessibility/CaretBrowsing/explainer.md) explainer and [Design Doc](Accessibility/CaretBrowsing/designDoc.md) | ✅Shipped in Edge XX
* [Tagged PDFs support](PDF/TaggedPDF/explainer.md) explainer
* [UI Automation Provider Mappings](Accessibility/UIA/explainer.md) explainer and [intent-to-implement](Accessibility/UIA/i2i.md) | ✅Shipped in Edge XX
* [WebVTT Caption Styling](WebVTTCaptionStyling/explainer.md) explainer

### Editing

* [Streamlined Text Input (TSF1)](TSF1/explainer.md) explainer | ✅Shipped in Edge XX

### Fonts

* [End User Defined Characters (EUDC)](EUDC/explainer.md) explainer | ✅Shipped in Edge XX

### HTML

* [Synthetic Module Record](SyntheticModules/designDoc.md) design document

### Media

* [Hardware-offloaded Audio Processing](AudioOffload/explainer.md) explainer
* [Media Cache Reduction](MediaCacheReduction/explainer.md) explainer

### Privacy

* [Auditing Privacy on the Web](WebPrivacyAuditing/explainer.md) a principles document describing our commitment to privacy through the principles of transparency, control, respect, and protection for our users.


### User Interaction

* [Impl Threaded Scrollbar scrolling](https://groups.google.com/a/chromium.org/forum/#!topic/input-dev/6ACOSDoAik4) intent-to-implement


# Withdrawn

When at first you don't succeed... don't give up! We're no longer pursuing
the solutions described in these explainers at this time, but that doesn't
mean the problem isn't worth solving. Have an idea for an alternate solution?
We'd love to hear your feedback!

* [Arbitrary Text Fragments](Fragments/explainer.md) explainer
* [Custom Dialog on Close](CustomDialogOnClose/explainer.md) explainer
* [Password Reveal](PasswordReveal/explainer.md) explainer
