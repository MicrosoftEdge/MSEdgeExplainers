
# Allow `use` to reference an external document's root element by omitting the fragment. 

## Authors:
- Divyansh Mangal (dmangal@microsoft.com) (https://github.com/goldenboy777)

## Participate
Feature request: [[SVG2] Allow <use> to reference entire files.](https://issues.chromium.org/issues/40362369)

Spec: [https://svgwg.org/svg2-draft/struct.html#UseElement](https://svgwg.org/svg2-draft/struct.html#UseElement)


## Table of Contents


- [1. Introduction](#1-introduction)
- [2. Problem Statement](#2-problem-statement)
- [3. Current Limitation](#3-current-limitation)
- [4. Motivation](#4-motivation-and-user-use-case)
  - [4.1 Manual Editing:](#41-manual-editing)
  - [4.2 Downsides of Using id#](#42-downsides-of-using-id)
- [5. Proposed Approach](#5-proposed-approach)
- [6. Customer/Developer Feedback: Pain Points](#6-customerdeveloper-feedback-pain-points)
- [7. References & acknowledgements](#7-references--acknowledgements)

## 1. Introduction
The `use` element in SVG allows for the reuse of existing SVG elements by referencing them. This helps reduce the amount of code and makes it easier to manage and update SVG graphics. 

## 2. Problem Statement 
The `use` element does not support referencing entire SVG files directly. It only allows referencing specific elements within an SVG file using an id attribute/fragment identifier. This limitation creates significant friction for developers, as it requires manual modification of the source SVG files — adding id attributes or defining fragment identifiers — in order to use it. This manual process not only increases development and maintenance overhead but is also error-prone and can lead to inconsistencies, particularly in scenarios where SVG assets are frequently updated or sourced externally. This limitation breaks the common developer expectation of being able to reuse SVG assets out-of-the-box — especially when sourcing icons or illustrations from design systems, marketplaces, or third-party libraries. 

Ultimately, the lack of support for referencing entire external SVG files using `use` reduces developer productivity, increases the risk of inconsistencies, and makes scalable asset management more challenging — particularly for complex graphics and large icon sets. ( Refer Section [Customer/Developer Feedback: Pain Points](#6-customerdeveloper-feedback-pain-points))  

## 3. Current Limitation

To use the whole SVG with a `use` tag, you typically need to reference a specific element within the SVG file using a fragment identifier (an id with a hash #): 

```html
<svg> 

  <use xlink:href="myshape.svg#icon"></use> 

</svg> 
```

In this example, `#icon` is the fragment identifier pointing to an element with `id="icon"` within myshape.svg, which might look like: 

_myshape.svg_

```html
<svg id="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0,0,512,512"> 

 <circle cx="256" cy="256" r="200" fill="red" /> 

</svg> 
```

## 4. Motivation and User Use Case

The above [limitation](#3-current-limitation) introduces the below issues while using #id:

### 4.1 Manual Editing: 

**Example:** Consider an SVG file without an id: 

```html
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0,0,512,512"> 

 <circle cx="256" cy="256" r="200" fill="red" /> 

</svg> 
```

To use this SVG with a <use> tag, you need to add an id: 

```html
<svg id="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0,0,512,512"> 

  <circle cx="256" cy="256" r="200" fill="red" /> 

</svg> 
```

Then reference it: 

```html
<svg> 

  <use xlink:href="myshape.svg#icon"></use> 

</svg> 
```

### 4.2 Downsides of Using id# 

- **Increased Workload:** Manually adding id attributes to each SVG file increases the workload, especially if you have many SVG files. 

- **Error-Prone:** Manual editing can lead to errors, such as typos or missing id attributes. 

- **Inconsistent Updates:** If the SVG files are updated frequently, ensuring that each file has the correct id can be challenging and lead to inconsistencies. 

- **Maintenance Overhead:** Keeping track of id attributes and ensuring they are correctly referenced adds to the maintenance overhead. 

## 5. Proposed Approach
Allow the `use` element to reference entire SVG files without needing an id. This means we can reuse the whole SVG file like this: 

```html
<svg width="100" height="100"> 

  <use href="icon.svg" /> 

</svg>
``` 

In above svg we now return the root svg element of `icon.svg` when the `use` element try to resolve its href target. That way the entire svg pointed by icon.svg will be rendered.

Note that in the current code base if we use the above svg as is nothing will be rendered. As the `use` element is unable to resolve the target to render without the fragment identifier. 
 

## 6. Customer/Developer Feedback: Pain Points  

*Whenever I import an SVG with <use> element it won't work unless I specify the id of that SVG even though it's the only SVG in the document!* [Link](https://stackoverflow.com/questions/68746095/why-cant-i-import-an-svg-by-using-use-without-using-the-id)  

https://stackoverflow.com/q/47595422/8583692 
*SVG external reference without id*

https://stackoverflow.com/q/50896563/8583692
*Why do SVG fragment identifiers without hash not work?* 

https://stackoverflow.com/q/41809208/8583692
*Why the <use> element in SVG doesn't work?* 

https://stackoverflow.com/q/7215009/8583692  
*How to reference external SVG file in SVG correctly?* 

https://stackoverflow.com/q/55452106/8583692
*How to use the whole SVG with a <use> tag?*

https://stackoverflow.com/q/53794292/8583692
*Display external SVG with <use> tag and href or xlink:href attribute?* 

https://stackoverflow.com/q/68746095/8583692
*Why can't I import an SVG by using <use> without using the id?* 

## 7. References & acknowledgements 

Many thanks for valuable feedback and advice from: 

- Fredrik Söderquist
- Abhishek Singh
- Daniel Clark
- Ragvesh Sharma