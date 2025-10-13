# Comparing proposals
## Microsoft's previous proposal
Taken from [HTML Modules Explainer](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md)

### HTML module sample code

```html
<resource-1 id="resource1">...</resource-1>
<resource-2 id="resource2">...</resource-2>
<resource-3 id="resource3">...</resource-3>

<script type="module">
    let resource = import.meta.document.getElementById("resource1");
    export { resource }
</script>
```

or

```html
<!--Default export-->
<resource-1 id="resource1">...</resource-1>
```

**Exporting resources:**

```js
let resource = import.meta.document.getElementById("resource1");
export { resource }
```

Script within an HTML Module can look up resources via

```js
import.meta.document.getElementById(...)
```

**Importing resources:**

ES Module syntax

```js
import { content } from "./my-module.html" with { type: "html" };
```

and

```js
// For default exports
import importedDoc from "./my-module.html" with { type: "html" };
let resource = importedDoc.getElementById("resource1");
```

### Key characteristics of the proposal
- Uses import attributes syntax.
- Follows normal HTML5 parsing rules.
- Only allows `<script type="module>"` inside HTML modules (non-module scripts cause failure).
- Introduces a new `import.meta.document` property for inline module scripts that refers to the HTML Module document.
- An HTML Module will specify its exports using its inline script elements. They can export elements, classes, or functions.
- If no script specifies a default export, the entire HTML document becomes the default export.
- No declarative way to export.

## Rob Eisenberg's current proposal
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
import Resource1, { Resource2 } from "./my-module.html" with { type: "html" };
```

HTML document

```html
<import src="./my-module.html#Resource2">
```

**Note:** A `<link>` element with a new `rel` type can be used instead of introducing the `<import>` element.

### Key characteristics
- Offers a declarative way to consume HTML Modules.
