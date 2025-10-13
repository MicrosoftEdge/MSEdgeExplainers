# Comparing proposals
## Authors:
- [Ana Sollano Kim](https://github.com/anaskim)
- [Jayson Chen](https://github.com/ja-y-son)

## Last updated:
October 2025

## Microsoft's previous proposal
Taken from [HTML Modules Explainer](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md)

### HTML module sample code

```html
<resource-1 id="resource1">...</resource-1>
<resource-2>...</resource-2>

<!--Exporting resources via inline script-->
<script type="module">
    // Use `import.meta.document`
    let resource = import.meta.document.getElementById("resource1");
    export { resource }
</script>
```

or just

```html
<!--Default export-->
<resource-1 id="resource1">...</resource-1>
```

**Importing resources:**

ES Module syntax

```js
import { content } from "./module.html" with { type: "html" };
```

and

```js
// For default exports
import Resource1 from "./module.html" with { type: "html" };
let resource = Resource1.getElementById("resource1");
```

### Key characteristics of the proposal
- Uses import attributes syntax.
- Follows normal HTML5 parsing rules.
- Only allows `<script type="module>"` inside HTML modules (non-module scripts cause failure).
- Introduces `import.meta.document` property for inline module scripts that refers to the HTML Module document.
- Offers a way for an HTML Module to specify its exports using inline script elements. They can export elements, classes, or functions.
- If no script specifies a default export, the entire HTML document becomes the default export.
- Does not support declarative exports.
- Imports resources using the ES Module syntax.

## Rob Eisenberg's proposal
Taken from [HTML Modules and Declarative Custom Elements Proposal](https://gist.github.com/EisenbergEffect/8ec5eaf93283fb5651196e0fdf304555#html-modules).

### HTML module sample code

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
  </head>
  <body>
    <resource-1>...</resource-1>
    <resource-2>...</resource-2>
    <resource-3>...</resource-3>
  </body>
</html>
```

or

```html
<resource-1>...</resource-1>
<resource-2>...</resource-2>
<resource-3>...</resource-3>
```

**Exporting resources:**

```html
<!--Default export-->
<resource-1 export>...</resource-1>

<!--Named export as Resource2-->
<resource-2 export id="Resource2">...</resource-2>

<!--Not exported-->
<resource-3>...</resource-3>
```

Script within an HTML Module can look up resources via

```js
import.meta.document.getElementById(...)
```

**Importing resources:**

ES Module syntax

```js
import Resource1, { Resource2 } from "./module.html" with { type: "html" };
```

HTML document

```html
<import src="./module.html#Resource2">
```

**Note:** A `<link>` element with a new `rel` type can be used instead of introducing the `<import>` element.

### Key characteristics
- Introduces HTML Modules as a new type of HTML "document" that contains exportable resource definitions. These can be imported into  HTML documents, other HTML Modules, and/or ES Modules.
- Offers a declarative format for exporting HTML resources via the `export` attribute.
- Imports resources using both ES Module syntax and also declaratively via a new element `<import src="...">`
- Proposes that all nodes are exported as a `DocumentFragment`, except for `<template>`, `<style>`, `<element>` (new), `<registry>` (new).

## Notable differences
1. Microsoft's previous proposal defines only an imperative way to export resources, while Rob Eisenberg's proposal introduces a declarative version.
2. Microsoft's previous proposal relies on ES Module syntax for importing resources, while Rob Eisenberg's proposal introduces a new `<import>` element (which may be replaced with a `<link rel="...">` element).
3. Both proposals support default exports via different approaches:

### Microsoft's previous proposal for default exports
#### Export

```html
<resource-1 id="resource1">...</resource-1>
```

#### Import
```js
import Resource1 from "./module.html" with { type: "html" };
```

### Rob Eisenberg's proposal for default exports
#### Export
```html
<resource-1 export>...</resource-1>
```

#### Import
In JS

```js
import Resource1 from "./module.html" with { type: "html" };
```

In HTML

```html
<import from="./module.html"></import>
```