# Source Maps v4 Revision

Authors: [Rob Paveza](https://github.com/robpaveza)

## Status of this Document
This document is a starting point for engaging the community in developing collaborative solutions. Source maps are not generally managed or standardized within the W3C or a similar governing body beyond what is supported within the browser developer tools. This document is not intended to block something in that direction, but rather to engage the community with options and discussion about the nature of developer tools.
* This document status: **Active**
* Expected venue: Ad-hoc discussions, to be expanded if there is interest in the community
* **Current version: this document**

### Revising the standard

We want to recognize the previous standard and the contributions the former authors have made as part of this implementation. We are taking this avenue of publishing in the Microsoft Edge Explainers repository because the former standard has not been updated in 8 years, and the Mozilla source maps discussion list is not even available in archives.

## Introduction

The [previous version of the Source Maps specification](https://sourcemaps.info/spec.html) is reasonably thorough in supporting live debugging. However, one shortcoming that the specification lacks is that it isn't obvious how to decode the names of functions on the call stack. Several implementations (including Node.js and a library [stacktrace-gps](https://github.com/stacktracejs/stacktrace-gps)) use name guessing, and [pasta-sourcemaps](https://github.com/bloomberg/pasta-sourcemaps) uses precompilation and a custom extension to reconstruct a stack trace.

## Goals

 * Improve post-hoc debugging capabilities
 * Preserve compatibility with existing tooling

## Non-Goals

Nothing specific at this time.

## Use Cases

*The following was taken from [an issue opened on the TypeScript repo](https://github.com/microsoft/TypeScript/issues/46695):*

Suppose I receive the following information from my application:

```
TypeError: Cannot read properties of undefined (reading 'x')
    at re.draw (bundle.js:1:16372)
    at re.drawLayer (bundle.js:1:14170)
    at be.draw (bundle.js:1:74592)
    at Te.render (bundle.js:1:114230)
    at Te.reflowCanvas (bundle.js:1:113897)
    at HTMLDocument.anonymous (bundle.js:1:135849)
```

The source map will resolve the first stack frame to `draw(src, sprite, x, y, frame)`, and will correctly point out that the failure here is that the undefined value is actually `frame`. However, *that is not the name of the function*. The function's name is `draw`, which is a member of the `Render` class.

If I simply apply the value of the `names` array to the function, decoding the stack trace is not particularly useful. It would look something like this:

```
TypeError: Cannot read properties of undefined (reading 'x')
    at frame (file1.ts:302:7)
    at draw (file1.ts:144:5)
    at Render (file2.ts:95:5)
    at drawArray (file3.ts:178:5)
    at render (file3.ts:155:5)
    at game (file4.ts:39:5)
```

Using the source map to navigate the source code by hand, I can reconstruct the original call stack:

```
TypeError: Cannot read properties of undefined (reading 'x')
    at Render#draw (file1.ts:302:7)
    at Render#drawLayer (file1.ts:144:5)
    at GameObject#draw (file2.ts:95:5)
    at Game#render (file3.ts:178:5)
    at Game#reflowCanvas (file3.ts:155:5)
    at [anonymous function passed to addEventListener] (file4.ts:39:5)
```

But doing this required that I dump the mappings and the source files from the source map and manually inspect the source files. In general, this requires that I use a library to parse the `mappings` field from Source Maps (because [as of Source Maps v3](https://sourcemaps.info/spec.html), this field is stored in a stateful way).

## Proposed Solution

We want to adopt the general approach taken by the `pasta-sourcemaps` ("Pretty (and) Accurate Stack Trace Analysis") library. However, instead of adding to the `names` field, we will add two fields.

* Add two additional field to the source map: `scopes` and `scopeNames`
* The `scopes` field should be a list of ranges and pointers into `scopeNames`
* The ranges in the field should always point to **Original Source** locations.

### Practical example

Suppose we have the following TypeScript source:

```ts
// example.ts
1 function foo(bar: number): never {
2     throw new Error('Intentional.');
3 }
4 foo();
```

Direct TypeScript compilation would emit something fairly similar:

```js
// example.js
1 function foo(bar) {
2     throw new Error('Intentional.');
3 }
4 foo();
```

But running it through a minifier would probably transform it to an IIFE lambda:

```js
// example.min.js
1 (()=>{throw new Error('Intentional.')})();
```

Examining the call stack of this looks something like:

```
Error: Intentional.
    at <anonymous>:1:13
    at <anonymous>:1:40
```

We can get to the exact *locations* with source maps today, but assuming that the `mapping`'s 5th field ("the zero-based index into the `names` list associated with the segment) is encoded as it typically is, which is meant for live debugging, the decoded stack would actually look like this:

```
Error: Intentional
    at throw (example.js:2:5)
    at foo (example.js:4:1)
```

What we want to get to from here would be, at minimum:

```
Error: Intentional.
    at foo (example.js:2:5)
    at Global code (example.js:4:1)
```

### Improving the contents of the map

Let us re-examine the original code in this example:

```ts
1 function foo(bar: number): never {
2     throw new Error('Intentional.');
3 }
4 foo();
```

The scopes list should be as follows:

1. Line 1 Col 1 -> Line 1 Col 34 (captures `function foo(bar: number): never ` including the trailing space): `Global code`
1. Line 1 Col 35 -> Line 3 Col 1 (captures the entire body of `foo`): `foo`
1. Line 3 Col 2 -> Line 4 Col 7 (captures the newline + invocation of `foo`): `Global code`

By de-duplicating the names, that yields the expected `scopeNames` value of `['Global code', 'foo']`.

Finally, `scopes` will be a comma-delimited list of Base64-encoded VLQs with the following set of entries (please note, all offsets are 0-based, in concurrence with the previous Source Maps spec):

1. A value representing the current source index, relative to the previous source index value. If this is the first value, it is an absolute value.
2. A value representing starting line, relative to the previous starting line value. If this is the first value, it is an absolute value.
3. A value representing the absolute starting column number.
4. A value representing the ending line, **relative to the starting line** value.
5. A value representing the ending starting column number.
6. An index into the `scopeNames` array.

This enhancement chooses to use a combination of relative and absolute numbers because of the nature of the values in question. For source line offsets, using relative encoding makes sense, because the numbers are always expected to be increasing. For column numbers, however, it is highly likely that, because these values represent locations in the *source* file, offsets from starting- to ending-location would be negative, and further, that offsets from an outer-scoped function to an inner-scoped function would be negative. Given that one might expect most source lines to be less than 120 characters in length, there does not appear to be a major need to encode the column as relative.

Given the above list, we should then encode the above values:

```json
{
    "sources": ["example.js"],
    "scopeNames": ["Global code", "foo"],
    "scopes": [
        "[0,0,0,0,33,0],[0,0,34,2,0,1],[0,2,1,1,6,0]"
    ]
}
```

Or, when encoded with VLQ, as:

```json
{
    "sources": ["example.js"],
    "scopeNames": ["Global code", "foo"],
    "scopes": "AAAAiCA,AAkCEAC,AECCMA"
}
```

### Specific naming recommendations

The following recommendations are **recommendations only** and not part of the "standard". They are, rather, a best attempt to identify how common examples can produce high-fidelity diagnostics experiences.

* **Class names included**: Class member functions should indicate that they are members of classes. Although a common JavaScript convention has been to use `#` as a shorthand for `Class.prototype.member`, the inclusion of `#` as valid syntax for `private` field shorthand suggests that this should not be used. This spec recommends that the expansion `ClassName.functionName` should be used for instance functions, and `static ClassName.functionName` for static functions.
* **Anonymous callback name inference**: Callback functions are often anonymous, but the name of the function being invoked is typically interesting. In the following example, an interesting function name might be something along the lines of `anonymous function passed to myArray.map`:

```ts
    return myArray.map((item, index) => {
        /// ...
    });
```

 * **Computed names expressions**: Computed names also present an interesting problem of data that are not available at build time. As best as possible, the original source text should be simply preserved:

 ```ts
class Example {
    static [Symbol.species]() { return Object; }
    ['to' + 'String']() {
        return 'Hello, world.';
    }
}
 ```

* In the above example, we would want to see `static Example.[Symbol.species]` and `Example.['to' + 'String']` in the `scopeNames` field of the source map.

## Privacy and Security Considerations

### Privacy

There should be no privacy considerations with this change.

### Security

There should be no security concerns with this change.

## Alternative Solutions

The original change proposed with the issue was to enhance the `mappings` array:

> Substantively: Only the `mappings` field would be altered, and would be altered by adding the 6th field. The complete section is included below:
>
> > The “mappings” data is broken down as follows:
> >
> >    - each group representing a line in the generated file is separated by a ”;”
> >    - each segment is separated by a “,”
> >    - each segment is made up of 1,4<s> or 5</s>**, 5, or 6** variable length fields.
> >
> > The fields in each segment are:
> >
> >   1. The zero-based starting column of the line in the generated code that the segment represents. If this is the first field of the first segment, or the first segment following a new generated line (“;”), then this field holds the whole base 64 VLQ. Otherwise, this field contains a base 64 VLQ that is relative to the previous occurrence of this field. Note that this is different than the fields below because the previous value is reset after every generated line.
> >   2. If present, an zero-based index into the “sources” list. This field is a base 64 VLQ relative to the previous occurrence of this field, unless this is the first occurrence of this field, in which case the whole value is represented.
> >   3. If present, the zero-based starting line in the original source represented. This field is a base 64 VLQ relative to the previous occurrence of this field, unless this is the first occurrence of this field, in which case the whole value is represented. Always present if there is a source field.
> >   4. If present, the zero-based starting column of the line in the source represented. This field is a base 64 VLQ relative to the previous occurrence of this field, unless this is the first occurrence of this field, in which case the whole value is represented. Always present if there is a source field.
> >   5. If present, the zero-based index into the “names” list associated with this segment. This field is a base 64 VLQ relative to the previous occurrence of this field, unless this is the first occurrence of this field, in which case the whole value is represented.
> >    6. **If present, the zero-based index into the "names" list associated with the call stack of this segment. This field is a base 64 VLQ relative to the previous occurrence of this field, unless this is the first occurrence of this field, in which case the whole value is represented.**
>
> In addition, the `version` field of the spec should be bumped to 4.

However, this is likely to require modifications across a tool chain. Supposing we had a tool chain that required, e.g., `typescript`, `webpack`, and `terser`, all of these tools would need to be modified to be aware of the 6th quantity in the VLQ of each mapping, *even if it was just to pass them through* (which is likely the case for this particular use case).
