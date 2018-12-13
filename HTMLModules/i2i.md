# Intent to Implement: HTML Modules

## Contact emails

daniec@microsoft.com, sasebree@microsoft.com, travil@microsoft.com, pcupp@microsoft.com

## Explainer

[HTML Modules explainer](https://github.com/dandclark/MSEdgeExplainers/blob/master/HTMLModules/explainer.md)

## Design doc/Spec

(Design doc link here...)

TAG review is pending.

## Summary

We are proposing an extension of the ES6 Script Modules system to include HTML Modules. These will allow web developers to package and access declarative content from script in a way that allows for good componentization and reusability, and integrates well into the existing ES6 Modules infrastructure.

## Motivation

The introduction of ES6 script modules has provided several benefits for javascript developers including more componentized code and better dependency management. However, easy access to declarative content has been a consistent limitation with script modules. For example, if one wants to pack a custom element definition in a module, how should the HTML for the element's shadow tree be created? Current solutions would involve generating it dynamically (document.createElement or innerHTML), but it would be preferable to simply write HTML and include it with the module. With HTML Modules this will be possible.

There is clear demand for this functionality in the developer community -- see [this thread](https://github.com/w3c/webcomponents/issues/645) where ideas pertaining to HTML modules have resulted in a great deal of developer and browser implementer engagement.

HTML Imports was proposed (and implemented in Chromium) as a solution, but that spec was developed independently of ES6 Modules and has several limitations:

* **Global object pollution:** vars created in an HTML Import show up on the global object by default. This global object pollution was removed in ES6 Modules.
* **Parse blocking with inline script:** the load of an HTML Import will block the main document's parser if included prior to an inline script element. ES6 modules have defer semantics and thus do not block the parser.
* **Independent of dependency resolution infrastructures between HTML Imports and HTML Modules:** since these systems were developed independently their infrastructures for dependency resolution don't talk to each other, leading to missed performance opportunities and to bugs like this one.
* **Non-intuitive import pass through:** HTML Imports requre the consumer to access their content due to standard DOM queries like getElementById and querySelector. This is clumsy and limited relative to script modules' import/export statements that allow for explicit specification of the API surface provided by a module.

Integrating HTML modules into the existing ES6 module system, rather than creating it as a standalone component, will address these gaps.

## Risks

### Interoperability and Compatibility

**Compatibility risk:** same as Interoperability risk

### Ergonomics

HTML modules are expected to be used in tandem with script modules.  They will share the existing import/export syntax, and both types of modules can be imported from the other.

Performance will be pay-for-play.  Performance of script modules that don't use HTML modules will not be affected; the only added cost would be various "is this an HTML or a script module" checks.  There will be no impact outside of the module infrastructure.

### Activation

Developers already familiar with ES6 script modules should find HTML modules easy to pick up, as they introduce no changes to the existing import/export changes and are a logical extension of the current system.
Areas that may present some initial difficulty are the use of inline script modules to define the exports of an HTML module, and the fact that non-module scripts are not allowed in an HTML module.  We will need to ensure that this behavior is well-documented and that the errors emitted by DevTools are clear and helpful.  Beyond these basic concepts though there is nothing that introduces significant complexity beyond that of existing ES6 module behavior.

## Debuggability

The debugging experience will be similar to that of ES6 script modules as it is today.  Developers will be able to view the source files for HTML Modules in the DevTools Sources tab, and will be inline script in these files will support the same level as debugging as inline script in normal files (setting breakpoints, stepping through and inspecting vars, etc).

HTML module documents and the elements they contain will be dumpable in the DevTools console tab like normal DOM content.

## Will this feature be supported on all six Blink platforms (Windows, Mac, Linux, Chrome OS, Android, and Android WebView)?

Yes, this feature will be platform agnostic.

## Is this feature fully tested by [web-platform-tests](https://chromium.googlesource.com/chromium/src/+/master/docs/testing/web_platform_tests.md)?

Not yet, but we are working on a full set of tests that will be upstreamed to the web-platform-tests-suite.

## Link to entry on the feature dashboard

<TBD>

## Requesting approval to ship?

No
