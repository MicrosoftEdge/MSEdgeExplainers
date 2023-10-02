# Extending the Autocomplete Attribute to Editing Host Elements

Consider all sections required unless otherwise noted.

Authors: [Ben Mathwig](https://github.com/bmathwig), [Sanket Joshi](https://github.com/sanketj)

## Status of this Document

This document is a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**
* Expected venue: [WHATWG](https://whatwg.org/)
* Current version: [Link](#)

## Introduction
The current specification for `autocomplete` allows for the attribute to exist on elements of type `<input>`, `<textarea>`, and `<select>`. With the popularity of text controls using an [editing host](https://html.spec.whatwg.org/multipage/interaction.html#editing-host), we should consider allowing [editing host](https://html.spec.whatwg.org/multipage/interaction.html#editing-host) elements to also utilize the `autocomplete` attribute. While not a common scenario within the scope of form fields, there are applications for text prediction and autofill within [editing host](https://html.spec.whatwg.org/multipage/interaction.html#editing-host) elements.

## Goals
Expand the definition of the `autocomplete` attribute to include [editing host](https://html.spec.whatwg.org/multipage/interaction.html#editing-host) elements as autocompletion targets. [4.10.18.7.1 Autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute)

## Use Case
A developer may use the `autocomplete` attribute to take advantage of browser-provided writing assistance features like text prediction on `contenteditable` elements.

### Facebook.com: Writing a post
![Writing a post on facebook.com](facebook-post.png)

### Medium.com: Drafting an article
![Drafting an article on medium.com](medium-draft.png)

### Youtube.com: Commenting on a video
![Commenting on a video on youtube.com](youtube-video-comment.png)


The `autocomplete` attribute could also be used to enable additional browser-provided autocompletion features in the future. See a hypothetical example below.

![Contact details autocomplete example](contact-details-autocomplete-example.png)

A developer may also turn off `autocomplete` for an [editing host](https://html.spec.whatwg.org/multipage/interaction.html#editing-host). For example, the site may provide their own custom writing assistance tools. The developer would be able to achieve this by setting `autocomplete=off`.

## Out of Scope
1. Defining expected user agent behavior or user interface design.
2. Adding additional field names to the table for autofill values.

## Proposed Solution
We propose updating the group definitions in [4.10.18.7.1 Autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute) to include [editing host](https://html.spec.whatwg.org/multipage/interaction.html#editing-host) elements in the *Text* and *Multiline* sections.

**Before**
```
Text
    input elements with a type attribute in the Hidden state
    input elements with a type attribute in the Text state
    input elements with a type attribute in the Search state
    textarea elements
    select elements
Multiline
    input elements with a type attribute in the Hidden state
    textarea elements
    select elements
```

**After**
```
Text
    input elements with a type attribute in the Hidden state
    input elements with a type attribute in the Text state
    input elements with a type attribute in the Search state
    textarea elements
    select elements
    editing host elements
Multiline
    input elements with a type attribute in the Hidden state
    textarea elements
    select elements
    editing host elements
```

The text in [4.10.18.7.1 Autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute) will also need to be updated to reflect that the `autocomplete` attribute can be used for editing scenarios and not just for form autofill.

## Privacy and Security Considerations
### Privacy
The following section enumerates the potential security and privacy concerns identified during the development of this proposal and summarizes proposed solutions for each.

| Concern | Description | Proposed Solution |
| :- | :- | :- |
| Autofill Data Storage Leak | Increasing the scope of applicable elements for autofill will increase the risk that autofill populates [editing host](https://html.spec.whatwg.org/multipage/interaction.html#editing-host) elements with sensitive information without user consent. | Form field elements like `<input>` already have autofill mechanisms in user agents where sensitive information such as address or phone number. We don't believe there are additional actions to take here and the existing mitigations for other elements still apply. |

## Potential Extensions
One potential extension is to add new field name values to the table to allow for more dynamic autofill population of content.

## Alternative Solutions
### Spellcheck Attribute
The `spellcheck` attribute is specifically designed to control the browser's spellcheck and grammar check capabilities, therefore it is not semantically appropriate for control autocompletion.

### Text Prediction Attribute
A `textprediction` attribute could be introduced that takes `on/off` values, allowing developers to control whether the browser's text prediction is available on a text control. Such an attribute would be specific to text prediction and would not be future proof against additional types of autocompletion that browsers may introduce in the future.

## Open Questions
### Should the `autocomplete` attribute be supported on [EditContext editable hosts](https://w3c.github.io/edit-context/#dfn-editcontext-editing-host)?
The [`EditContext` API](https://w3c.github.io/edit-context/) introduces a specialized editing host that enables editing applications to integrate with [text input services](https://w3c.github.io/edit-context/#dfn-text-input-service) without the [pitfalls of the browser's in-built text controls](https://w3c.github.io/edit-context/#background). Many sophisticated editors that could benefit from the `EditContext` API also integrate their own writing assistance features and thus may opt out of browser-powered autocompletion (ex. Google Docs, Word Online). Therefore, it is unclear whether supporting the `autocomplete` attribute on [EditContext editable hosts](https://w3c.github.io/edit-context/#dfn-editcontext-editing-host) will be useful.

Implementation wise, when an `EditContext` is being edited, the UA does not directly update the DOM. Instead, content changes are communicated to the author via [events](https://w3c.github.io/edit-context/#editcontext-events) and the author is expected to commit those changes to the DOM in their custom way. To support browser-powered autocompletion in [EditContext editable hosts](https://w3c.github.io/edit-context/#dfn-editcontext-editing-host), a new type of event may need to be introduced to indicate to authors how/where to place the autocompletion suggestions.