# Auditing Privacy on the Web

## Introduction
This document outlines a set of principles that describe how we believe users' personal information should be handled across the web and capture our desire to see privacy treated as a fundamental human right. It touches upon the state of tracker-based advertising on the web today and the challenges that arise when these practices meet the practices of web browsers as they start to develop features that empower users to take control of their privacy. Finally, it outlines and welcomes industry feedback on a proposal for an auditing program for privacy on the web. We view such a program as a step in the right direction when it comes to enabling web browsers, data collection companies, and advertisers to provide the right set of privacy controls and default behaviors to their users.

## Motivation
We believe that users should feel safe, confident, and empowered when it comes to sharing or interacting with their personal information on the web. This sentiment is best summarized in the following set of principles:

* **Transparency** – We believe that users should be able to understand what data is being collected on them and how it is being used across the web to tailor the content they experience
* **Control** – We believe that users should have access to a set of easy to use controls that allow them to choose what data they share on the web and how this data is used
* **Respect** – We believe that the choices users make when it comes to controlling their data should be respected, that any attempts to circumnavigate the choices made via these controls should be prevented, and that the least amount of user data necessary to perform the task at hand should be collected
* **Protection** – Underlying all these principles, we believe that user data should always be securely stored and transmitted

Beyond these privacy-centric principles, we also want to ensure our users have a great experience when browsing the web. This means that we are dedicated to delivering high levels of compatibility, performance, and reliability for all.

Microsoft Edge, and other web browsers like Apple Safari, Mozilla Firefox, and others, have started laying the foundation to give users more control of their privacy while browsing, investing in tracking prevention features to protect them from third party sites tracking and collecting their browsing activity on the web. While these approaches protect user privacy, they affect advertisers and publishers by reducing the relevance of the ads they can serve. This has a non-negligible impact on their bottom line and may hurt the vibrancy of the web.

While [Microsoft Edge's Balanced mode](https://blogs.windows.com/msedgedev/2019/06/27/tracking-prevention-microsoft-edge-preview/) for tracking prevention attempts to limit compatibility impact, stricter modes of tracking prevention can have unintended impact on legitimate web functionality like third-party authentication and measuring the impact of new features. Furthermore, they can break features implemented in such a way that they may be indistinguishable from tracking from a browser's perspective. We are supportive of new web standards, like the [Storage Access API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/master/StorageAccessAPI/explainer.md), that attempt to address some of these issues, but also recognize that such APIs require additional user interactions and hence aren't applicable in all use-cases. Ultimately, given their capabilities today, it's difficult for web browsers to technically validate whether companies are giving users the right level of privacy controls in all cases; as a result, if web browsers want to prioritize user privacy, they are forced to treat all companies with the capacity to track users alike.

To solve these issues, and to encourage companies to provide users with transparency, control, and respect over their data and preferences, we believe that browser vendors must work together with companies involved in data collection and advertising on a combination of technical and policy-based solutions that help elevate the state of privacy on the web. To guide these solutions, we would like to align on the above set of user-centric principles across the industry and use it as the basis for new web standards and proposals that will help ensure that customer privacy is respected. Furthermore, we would like to propose the creation of an auditing program for both first and third parties that could be used in conjunction with technological solutions to bolster their effectiveness and improve their respective user experiences with the end goal of giving users more control over their privacy on the web.

With this context in mind, it's useful to propose a set of goals that we aim for this proposal to achieve.

## Goals
The main goals of this proposal are as follows:
* To start an industry-wide discussion on whether an auditing program that certifies first and third parties is a useful tool to boost the effectiveness of current and future-looking technological mechanisms for preserving user privacy
* To start an industry-wide discussion on defining a set of privacy principles for the web
* To propose a potential privacy-preserving min-bar for first and third parties to be audited against. This min-bar would focus on driving the following user-centric outcomes:
    * Users can clearly understand what information is being collected on them by companies as they browse the web, how this information is being shared, and how it is being used to tailor the web content they experience
    * Users can delete data that has been collected on them by companies, including any data that has been shared with other entities
    * Companies honor users' preferences for control and do not use privacy infringing techniques such as fingerprinting to collect information on them

## Potential Use Cases
We believe that an auditing program for first and third parties could be used to augment technological solutions in several current and future-looking contexts. A few examples are provided below:

### Third Party Tracking Prevention
As mentioned above, many web browsers are investing in tracking prevention features to protect users from third party sites tracking and collecting their browsing patterns on the web, an activity which today occurs predominantly through cookies. While these features preserve customer privacy, they have been found to impact compatibility and the economic feasibility of publishing ads on the web. These consequences, especially the latter, have sparked growing concerns that companies will be incentivized to find alternate methods like fingerprinting to work around such features. These alternate methods cannot be controlled by the user and are not transparent in terms of the data they collect and how that data is used.

While there are several new web proposals aimed at both minimizing the effectiveness of such privacy infringing tracking mechanisms and at introducing new privacy-preserving techniques for web-based tracking, we understand that these will take time to be implemented and gain traction. While this process is underway, we believe that an auditing program for privacy on the web would accomplish three things:
1. It would discourage companies from leveraging privacy-infringing tracking practices in the short term
1. It would give third parties the ability to better collaborate with browser vendors to preserve user privacy by providing transparency and control over the users' data and respect for their preferences
1. It would ensure that privacy preserving companies can continue to use the advertisement-based economic models that are core to providing free content and services on the web while new standards are developed

Since a browser cannot validate that a web tracker is respecting user privacy through technological means alone, we believe that there is a financial incentive for third party companies involved in data collection and advertising to become certified under such a program. Being certified would also allow such companies to provide a signal to web browsers that they are meeting a high bar for giving users transparency, control, and respect over their data/preferences.

Equipped with knowledge of which companies have been certified, web browsers will be better suited to offer users the ability to make privacy preserving decisions; strict tracking prevention mechanisms that block all web trackers can still be provided for privacy conscious users while balanced mechanisms that allow certified trackers can be offered for users who value transparency and control over their data but accept the tradeoffs of online tracking.

### First Party Applications
For first parties, we believe that being certified under an auditing program for privacy on the web would accomplish two things:
1. It would allow first parties to confidently state that they are meeting a high bar for giving users transparency, control, and respect over their data/preferences
1. It would allow browsers to change the user experience in some fashion in response to a site that has been certified to uphold user privacy

### Helping users manage their online data
A certification program would also allow for the validation of standardized transparency and delete signals between the web browser and data collection entities. This would allow browsers to build views that let their users more easily manage their online data in a one stop shop, including viewing and deleting the data that certified entities have on them. Examples of features could include:
* Dashboards where users could easily view the data that's been collected on them and understand how it's been shared or used to tailor the web content they're experiencing
* Clear browsing data experiences whereby users could clear both client-side browser data in addition to data that's been collected on them by various first and third parties as they browse the web

### Reducing User Permission Prompts
Several of the future looking web standard proposals for preserving user privacy—such as the current iterations of the [Storage Access API](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/StorageAccessAPI/explainer.md) and [Privacy Budget](https://github.com/bslassey/privacy-budget)—touch on the use of permission prompts to inform users when some information that could be used to track them is to be shared on the web. Such prompts may be shown when certain technological heuristics say that they should be, disrupting a user's experience while browsing the web.

An auditing program for privacy on the web could again be used to augment such technological solutions by suppressing user permission prompts on sites that are known to give users control over their privacy.

### Additional Use Cases
As stated above, the examples above have been provided to start a discussion on whether an auditing program for privacy on the web would be a useful tool to combine with both current and future-looking technological solutions. We welcome industry feedback on other use cases where such a program could be useful.

## Auditing Privacy on the Web: A Proposed Min-Bar
Using the principles above as a guideline, we believe that an effective min-bar for an auditing program for privacy on the web would need to establish that certified companies provide users with transparency and control over their data while also ensuring that they do not use any privacy-infringing tracking techniques to collect user information.

With this context in mind, we propose that such an auditing program take the following shape:
* Independent auditors with no fiduciary interest in advertisement or data collection would assume the role of auditing companies.
    * How auditing is performed is an open topic for debate; some approaches we've considered are via an already established auditing agency, via an existing non-profit entity (or set of entities), or via a new non-profit entity (or set of entities)
* A central entity (or set of entities) would maintain a list of certified companies. This entity/set of entities could be the same or different from the entity/entities responsible for auditing
* Companies would be certified by auditors if they meet the following criteria:
    * They provide a mechanism whereby the user can request (via the browser) a view of what data has been collected on them, who it has been shared with, and how (if at all) it has tailored the web content they are experiencing
    * They provide a mechanism whereby the user can request (via the browser) the deletion of some or all their data. This action will also delete the user's data from anywhere else it has been shared to
    * They honor users' choices for data control and do not make use of any privacy infringing techniques such as fingerprinting to perform tracking

One open issue that will need to be tackled is the concept of attestation without creating new identifiers that can be used as "supercookies" to track users. This will be necessary to confirm that the view and delete requests proposed above originated from the user rather than a malicious third party with the intent of either viewing sensitive user information or bulk-deleting information from first and third parties. The recently proposed [Trust Token API](https://github.com/dvorak42/trust-token-api) is one potential mechanism by which this could be achieved, however we'd like to start an open dialog with the industry on other methods as well so that we settle on the best overall approach.

In conclusion, this document explains the motivation behind, and defines a potential min-bar for an auditing program for privacy on the web. We believe that such a program would be a useful tool to have as an industry to augment technological solutions with the end goal of elevating privacy on the web. As it has been written, it is designed to spark an industry-wide discussion with browser vendors, ad networks, publishers, data collection companies, regulators, and other self-governing bodies to collect broad feedback on further requirements. It will be modified accordingly as consensus forms on the answers to these questions.

## Open Issues
There are several open issues that we invite folks from across the industry to weigh in on:
1. What are the requirements and the mechanism for auditing?
    1. Who should own/maintain the list of audited companies?
    1. Who should be responsible for auditing companies?
    1. How can we keep auditing costs low to not create any barriers to entry?
1. Should cross-company correlation of data be allowed within the network of audited companies?
1. Should data retention time limits be imposed on audited companies?
1. Should data encryption requirements should be imposed on audited companies?
1. Where should the view/delete experience live? (In the browser? Behind 2FA?)
1. How should we be thinking about governance/regulation as we continue to discuss this proposal?
1. How should attestation without creating a new, persistent user identifier be handled?

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Web%20Privacy%20Auditing) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BWeb%20Privacy%20Auditing%5D)
