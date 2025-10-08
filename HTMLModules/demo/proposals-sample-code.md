# Comparing proposals
## Microsoft's previous proposal
Taken from

```html
```

### Key characteristics
- 

## Rob Eisenberg's current proposal
Taken from [HTML Modules](https://gist.github.com/EisenbergEffect/8ec5eaf93283fb5651196e0fdf304555#html-modules).

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
ES Module

```js
import Resource1, { Resource2 } from "./my-module.html" with { type: "html" };
```

HTML document

```html
<import src="./my-module.html#Resource2">
```

**Note:** A `<link>` element with a new `rel` type can be used instead of introducing the `<import>` element.

### Key characteristics
- 
