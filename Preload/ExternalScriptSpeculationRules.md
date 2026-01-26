# External script of type "speculationrules"

Authors: [Viktoria Zlatinova](https://github.com/vickiez)

## Status of this Document

This document is intended as a starting point for engaging the community and standards bodies in developing collaborative solutions fit for standardization. As the solutions to problems described in this document progress along the standards-track, we will retain this document as an archive and use this section to keep the community up-to-date with the most current standards venue and content location of future work and discussions.

* This document status: **Active**  
* Expected venue: [WHATWG](https://whatwg.org/)
* Current version: this document

<!-- - [Discussion forum] -->

## Introduction

Currently speculation rules can only be added by inline script or HTTP response header. Developers expect to also be able to provide a script src so that speculation rules can be easily reused across documents.

The workaround is to use a classic external script to inject speculation rules, but it would be simpler for developers to specify an external script of type speculation rules directly. 

### Evidence of User Need

Developers have requested this functionality in issues across repos:
* WICG/nav-speculation: https://github.com/WICG/nav-speculation/issues/348
* Chromium: https://issues.chromium.org/issues/40170951 

## Goals and Use Cases

The primary goal is to enable developers to easily reuse speculation rules, especially in cases where web developers don't have meaningful control over the headers (common for statically hosted pages). 

Another goal is to close the gap in the current standard, as external sources can be provided for script elements of other types and developers are surprised to find this is not supported for speculation rules.

## Proposed Approach and Use Cases

Developers can add a `src` attribute to script elements of type `speculationrules` to specify the file with speculation rules.

HTML:
```html
<script type="speculationrules" src="speculation-rules.json"></script>
```

speculation-rules.json:
```json
{
    "prerender": [{
        "source": "document",
        "where": {
            "href_matches": "/*"
        },
        "eagerness": "moderate"
    }]
}
```

 This approach is similar to the one used by [HTTP response header speculation rules](https://html.spec.whatwg.org/multipage/speculative-loading.html#the-speculation-rules-header), and the steps to fetch speculation rules can mostly be reused here, including a mime type check for `application/speculationrules+json`. 
 
 Additional script attributes can be supported through the script fetch options object, with the `crossorigin` attribute applying the same way it does to module scripts. [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) should also be able to block this type of external script.

| Attribute | Supported for external speculation rules |
|---|---|
| `nomodule` | No |
| `async` | No |
| `defer` | No |
| `blocking` | No |
| `crossorigin` | Yes |
| `referrerpolicy` | Yes |
| `integrity` | Yes |
| `fetchpriority` | Yes |

## Alternatives Considered

The alternatives are to use the HTTP response header or classic external script to inject speculation rules. Developers do not always have control over headers, however, and providing a single src would be more straightforward than injecting speculation rules via classic external script.

Example of classic external script workaround from [#348](https://github.com/WICG/nav-speculation/issues/348):

HTML:
```html
<script src="inject-speculation-rules.json"></script>
```

JS:
```js
if (HTMLScriptElement.supports &&
    HTMLScriptElement.supports('speculationrules')) {
  const specScript = document.createElement('script');
  specScript.type = 'speculationrules';
  specRules = {
    prerender: [
      {
        source: 'document',ff
        where: {
          href_matches: '/*'
        },
        eagerness: 'moderate'
      }
    ],
  };
  specScript.textContent = JSON.stringify(specRules);
  console.log('added speculation rules to: next.html');
  document.body.append(specScript);
}
```

## Security Considerations

Similar to fetching speculation rules for the HTTP response header case, the external resource specified by the `src` attribute must be served with the appropriate MIME type: `application/speculationrules+json`.

Additionally, external scripts of type `speculationrules` also adhere to Content Security Policy. The CSP directive fallback chain is the same as for other external scripts: 
```
script-src-elem -> script-src -> default-src
```
The hash from the integrity attribute must match the one from CSP if provided.

External scripts of type `speculationrules` use CORS mode by default, similar to module scripts, and the `crossorigin` attribute can be used to include credentials.