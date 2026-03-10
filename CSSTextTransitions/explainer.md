# [Title]

## Authors:

- [Author 1] ([Affiliation 1])
- [Author 2] ([Affiliation 2])
- [etc.]

## Participate
- [Issue tracker]
- [Discussion forum]

## Table of Contents [if the explainer is longer than one printed page]

[You can generate a Table of Contents for markdown documents using a tool like [doctoc](https://github.com/thlorenz/doctoc).]

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

[The "executive summary" or "abstract".
Explain in a few sentences what the goals of the project are,
and a brief overview of how the solution works.
This should be no more than 1-2 paragraphs.]

## User-Facing Problem

[What is the **end-user need** which this project aims to address?]

### Goals [or Motivating Use Cases, or Scenarios]

- [A bulleted list of goals can help with comparing proposed solutions.]

### Non-goals

[If there are "adjacent" goals which may appear to be in scope but aren't,
enumerate them here. This section may be fleshed out as your design progresses and you encounter necessary technical and other trade-offs.]

## User research

[If any user research has been conducted to inform the design choices presented,
discuss the process and findings.
We strongly encourage that API designers consider conducting user research to
verify that their designs meet user needs and iterate on them,
though we understand this is not always feasible.]

## Proposed Approach

[Explain the proposed solution or approach to addressing the identified problem.
Do not include WebIDL in this section.
Show example code using your approach.]

[Where necessary, provide links to longer explanations of the relevant pre-existing concepts and API.
If there is no suitable external documentation, you might like to provide supplementary information as an appendix in this document, and provide an internal link where appropriate.]

[If this is already specced, link to the relevant section of the spec.]

[If spec work is in progress, link to the PR or draft of the spec.]

### Dependencies on non-stable features

[If your proposed solution depends on any other features that haven't been either implemented by
multiple browser engines or adopted by a standards working group (that is, not just a W3C community
group), list them here.]

### Solving [goal 1] with this approach

```js
// Provide example code - not IDL - demonstrating the design of the feature.

// If this API can be used on its own to address a user need,
// link it back to one of the scenarios in the goals section.

// If you need to show how to get the feature set up
// (initialized, or using permissions, etc.), include that too.
```

### Solving [goal 2] with this approach

[If some goals require a suite of interacting APIs, show how they work together to achieve the goals.]

[etc.]

## Alternatives considered

[This should include as many alternatives as you can,
from high level architectural decisions down to alternative naming choices.]

### [Alternative 1]

[Describe an alternative which was considered,
and why you decided against it.
This alternative may have been part of a prior proposal in the same area,
or it may be new.
If you did any research in making this decision, discuss it here.]

### [Alternative 2]

[You may not have decided about some alternatives.
Describe them as open questions here, and adjust the description once you make a decision.]

### [Alternative 3]

[etc.]

## Accessibility, Internationalization, Privacy, and Security Considerations

[Highlight any accessibility, internationalization, privacy, and security implications
that have been taken into account during the design process.]

## Stakeholder Feedback / Opposition

[Implementors and other stakeholders may already have publicly stated positions on this work. If you can, list them here with links to evidence as appropriate.]

- [Implementor A] : Positive
- [Stakeholder B] : No signals
- [Implementor C] : Negative

[If appropriate, explain the reasons given by other implementors for their concerns.]

## References & acknowledgements

[Your design will change and be informed by many people; acknowledge them in an ongoing way! It helps build community and, as we only get by through the contributions of many, is only fair.]

[Unless you have a specific reason not to, these should be in alphabetical order.]

Many thanks for valuable feedback and advice from:

- [Person 1]
- [Person 2]
- [etc.]

Thanks to the following proposals, projects, libraries, frameworks, and languages
for their work on similar problems that influenced this proposal.

- [Framework 1]
- [Project 2]
- [Proposal 3]
- [etc.]