# **Web Install API**
Authors: [Diego Gonzalez](https://github.com/diekus)

## State of the work

>**Here for Origin Trials?** 
The Web Install API is currently available as an [Origin Trial](https://developer.chrome.com/docs/web-platform/origin-trials/) in Chrome and Microsoft Edge versions 143-148. See [Origin Trial Instructions](https://github.com/MicrosoftEdge/Demos/blob/main/pwa-web-install-api/README.md) to learn more.


The work on Web Install has been separated into two explainers: _current_ and _background_ document installations. The '[**current document**](./explainer-current-doc.md)' installation refers to installation of the curently loaded web application and is [being discussed](https://github.com/w3c/manifest/pull/1175) in the Web Applications WG. The '[**background document**](./explainer-background-doc.md)' installation refers to installation of web applications different from the current loaded navigable. Background document installations are being discussed and incubated in WICG.

| Explainer | Expected Venue |
|--------|------------|
| [Web Install (current document)](./explainer-current-doc.md)  | WebApps WG |
| [Web Install (background document)](./explainer-background-doc.md)  | WICG |

## Abstract

The **Web Install API provides a way to democratise and decentralise web application acquisition**, by enabling ["do-it-yourself" end users and developers](https://www.w3.org/TR/ethical-web-principles/#control) to have control over the application discovery and distribution process. It provides the tools needed to allow a web site to install a web app. _This means end users have the option to more easily discover new applications and experiences that they can acquire with reduced friction_.

### Why?
The current way of acquiring a web app may involve search, navigation, proprietary protocols, proprietary app banners, and multiple other workarounds. This can be confusing for end users that must learn how to acquire apps in every different platform, with even different browsers handling the acquisition process differently.

The web platform doesn't have a built-in way to facilitate app discovery and distribution, the Web Install API aims to fix this.


## FAQs

See the [FAQs](./faq.md) about the Web Install API.

## Related links
- [TAG review](https://github.com/w3ctag/design-reviews/issues/1051)
- [Chrome Status page](https://chromestatus.com/feature/5183481574850560)
- [Chromium Bug](https://issues.chromium.org/issues/333795265)

## References & acknowledgements

This explainer takes on a reimagination of a capability [previously published by PEConn](https://github.com/PEConn/web-install-explainer/blob/main/explainer.md).

Throughout the development of this capability we've revceived a lot of feedback and support from lots of people. We've like to give a special thanks to Daniel Appelquist, Amanda Baker, Marcos Cáceres, Lu Huang, Kristin Lee, Daniel Murphy, Alex Russell and Howard Wolosky for their input.

## Feedback
For suggestions and comments, please file an [issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?assignees=diekus&labels=Web+Install+API&projects=&template=web-install-api.md&title=%5BWeb+Install%5D+%3CTITLE+HERE%3E).

![Web Install logo](installlogo.png)