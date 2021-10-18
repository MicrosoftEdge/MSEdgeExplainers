# Intent to Implement: HTML Modules

## Contact emails

daniec@microsoft.com, sasebree@microsoft.com, travil@microsoft.com, pcupp@microsoft.com

## Explainer

[HTML Modules Explainer](explainer.md)

## Design Doc/Spec

[HTML Modules Design Doc](designDoc.md)

[HTML Modules Proposed Spec Changes](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/html-module-spec-changes.md)

TAG review is pending.

## Summary

We are proposing an extension of the ES6 Script Modules system to include HTML Modules. These will allow web developers to package and access declarative content from script in a way that allows for good componentization and reusability, and integrates well into the existing ES6 Modules infrastructure.

## Motivation

The introduction of ES6 Script Modules has provided several benefits for JavaScript developers including more componentized code and better dependency management. However, easy access to declarative content has been a consistent limitation with Script Modules. For example, if one wants to pack a custom element definition in a module, how should the HTML for the element's shadow tree be created? Current solutions would involve generating it dynamically (document.createElement or innerHTML), but it would be preferable to simply write HTML and include it with the module. With HTML Modules this will be possible.

There is clear demand for this functionality in the developer community -- see [this thread](https://github.com/w3c/webcomponents/issues/645) where ideas pertaining to HTML Modules have resulted in a great deal of developer and browser implementer engagement.

[HTML Imports](https://www.w3.org/TR/html-imports/) were proposed (and implemented in Chromium) as a solution, but they were developed independently of ES6 Modules and have several limitations:

* **Global object pollution:** vars created in an HTML Import show up on the global object by default.  An ideal solution would minimize such side-effects.  Accordingly, global object pollution does not occur in ES6 Modules.
* **Parse blocking with inline script:** the load of an HTML Import will block the main document's parser if included prior to an inline script element. ES6 Modules have deferred semantics and thus do not block the parser.
* **Independent of dependency resolution infrastructures between HTML Imports and HTML Modules:** since these systems were developed independently their infrastructures for dependency resolution don't talk to each other, leading to missed performance opportunities and to bugs like this one.
* **Non-intuitive import pass through:** HTML Imports require the consumer to access their content due to standard DOM queries like getElementById and querySelector. This is clumsy and limited relative to Script Modules' import/export statements that allow for explicit specification of the API surface provided by a module.

Integrating HTML Modules into the existing ES6 Module system, rather than creating it as a standalone component, will address these gaps.

## Risks

### Interoperability and Compatibility

**Interoperability risk:**

We plan to initially ship the feature behind a runtime flag so that developers can experiment with the concept while spec changes are still being finalized.

Other browser implementers have expressed their support of the concept and its exploration during a Web Platform WG meeting at TPAC 2018 (see meeting minutes [here](https://www.w3.org/2018/10/26-WebPlat-minutes.html#item20)).  Specifically:

* **Edge**: We're strongly in favor of the feature.  Given the newly shared engine, Edge's support will arrive in a similar timeframe to Chromium.
* **Firefox**: Expressed support at TPAC 2018.  See also [this response to our initial proposal](https://github.com/w3c/webcomponents/issues/645#issuecomment-427317492) and [this page summarizing Mozilla's stance on HTML Imports](https://developer.mozilla.org/en-US/docs/Web/Web_Components/HTML_Imports) and the [status update](https://hacks.mozilla.org/2015/06/the-state-of-web-components/) it links to that indicates their desire to pursue a solution better aligned with ES modules.
* **Safari**: Expressed support at TPAC 2018.
* **Web / Framework developers**: The responses to [this post](https://github.com/w3c/webcomponents/issues/645#issuecomment-427205519) include a good cross-section of developer sentiment (mostly positive with some expressing concern about various details of the proposal), e.g. [[1](https://github.com/w3c/webcomponents/issues/645#issuecomment-427395178)], [[2](https://github.com/w3c/webcomponents/issues/645#issuecomment-427446523)], [[3](https://github.com/w3c/webcomponents/issues/645#issuecomment-433036372)].
* **See also**: [Google presentation](https://docs.google.com/presentation/d/1ksnC9Qr3c8RwbDyo1G8ZZSVOEfXpnfQsTHhR5ny9Wk4/edit#slide=id.gc6fa3c898_0_0) at BlinkOn about the idea of HTML Modules as a replacement for HTML Imports.

**Compatibility risk:**

Same as Interoperability risk

### Ergonomics

HTML Modules are expected to be used in tandem with Script Modules.  They will share the existing import/export syntax, and both types of modules can be imported from the other.

Performance will be pay-for-play.  Performance of Script Modules that don't use HTML Modules will not be affected; the only added cost would be various "is this an HTML or a Script Module" checks.  There will be no impact outside of the module infrastructure.

### Activation

Developers already familiar with ES6 Script Modules should find HTML Modules easy to pick up, as they introduce no changes to the existing import/export changes and are a logical extension of the current system.
Areas that may present some initial difficulty are the use of inline Script Modules to define the exports of an HTML Module, and the fact that non-module scripts are not allowed in an HTML Module.  We will need to ensure that this behavior is well-documented and that the errors emitted by DevTools are clear and helpful.  Beyond these basic concepts though there is nothing that introduces significant complexity beyond that of existing ES6 Module behavior.

## Debuggability

The debugging experience will be similar to that of ES6 Script Modules as it is today.  Developers will be able to view the source files for HTML Modules in the DevTools Sources tab, and will be inline script in these files will support the same level as debugging as inline script in normal files (setting breakpoints, stepping through and inspecting vars, etc).

HTML Module documents and the elements they contain will be dumpable in the DevTools console tab like normal DOM content.

## Will this feature be supported on all six Blink platforms (Windows, Mac, Linux, Chrome OS, Android, and Android WebView)?

Yes, this feature will be platform agnostic.

## Is this feature fully tested by [web-platform-tests](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_platform_tests.md)?

Not yet, but we are working on a full set of tests that will be upstreamed to the web-platform-tests-suite.

## Link to entry on the feature dashboard

TBD

## Requesting approval to ship?

No
