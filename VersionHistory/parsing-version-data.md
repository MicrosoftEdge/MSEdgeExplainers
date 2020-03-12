# Parsing Version History from RSS, Atom & JSON Feeds

When version histories are supplied using structured formats like [RSS](https://validator.w3.org/feed/docs/rss2.html), [Atom](https://tools.ietf.org/html/rfc4287), or [JSON Feed](https://jsonfeed.org/), implementors will need to parse that data and render it into a web page. This document suggests how that should be done, with a focus on key fields for each history item.

## Page Title

This identifies the purpose of the version history page. Alternatively, this could be the name of the app (taken from the Manifest) plus the text "Version History".

### Markup Recommendation

* `h1`

### Extraction Path

<dl>
<dt>RSS</dt>
<dd><code>rss > channel > title</code></dd>
<dt>Atom</dt>
<dd><code>feed > title</code></dd>
<dt>JSON Feed</dt>
<dd><code>object["title"]</code></dd>
</dl>

## Page Content (optional)

Valid RSS feeds will have descriptions, but neither Atom nor JSON Feed require it. Exposing this information should be considered optional.

### Markup Suggestion(s)

* `p`,
* `div`, or
* `documentFragment` (if the description contains flow-level elements).

### Extraction Path

<dl>
<dt>RSS</dt>
<dd><code>rss > channel > description</code></dd>
<dt>Atom</dt>
<dd><code>feed > description</code> (if present)</dd>
<dt>JSON Feed</dt>
<dd><code>object["description"]</code> (if present)</dd>
</dl>

## History Item

Each item in a version history should exist as a flow-level sectioning HTML element.

### Markup Suggestion(s)

* `article`,
* `section`, or
* `details`

### Extraction Path

<dl>
<dt>RSS</dt>
<dd><code>rss > channel > item</code> (each <code>item</code> is a history item)</dd>
<dt>Atom</dt>
<dd><code>feed > entry</code> (each <code>entry</code> is a history item)</dd>
<dt>JSON Feed</dt>
<dd><code>object["items"]</code> (each object in this array is a history item)</dd>
</dl>

## History Item Version

This is a string that names the given version. In some apps it may be numeric, in others it may be a string, but for the purposes of the parser, it should be considered to be a string and would likely be rendered into a heading element.

### Markup Suggestion(s)

* `h2`,
* `summary` (if `details` is used for an item),
* etc.

### Extraction Path

<dl>
<dt>RSS</dt>
<dd><code>rss > channel > item > title</code></dd>
<dt>Atom</dt>
<dd><code>feed > entry > title</code></dd>
<dt>JSON Feed</dt>
<dd><code>object["items"][0].title</code> falling back to <code>object["items"][0].id</code></dd>
</dl>

## History Item Content

This is a string that describes significant changes in this version.

### Markup Suggestion(s)

* `p`,
* `div`, or
* `documentFragment` (if the description contains flow-level elements).

### Extraction Path

<dl>
<dt>RSS</dt>
<dd><code>rss > channel > item > description</code></dd>
<dt>Atom</dt>
<dd><code>feed > entry > content</code> falling back to <code>feed > entry > summary</code></dd>
<dt>JSON Feed</dt>
<dd><code>object["items"][0].content_html</code> or <code>object["items"][0].content_text</code> (one of these must be present to be valid)</dd>
</dl>

## History Item Date

This is a representation of when the version was released and is optional.

### Notes

* Feed readers are instructed to ignore items with publish dates in the future.
* Date formats will include [the W3C’s scoped-down ISO 8601](https://www.w3.org/TR/1998/NOTE-datetime-19980827) (RSS & Atom) or follow [RFC 3339](https://www.ietf.org/rfc/rfc3339.txt) (JSON Feed).
* JSON Feed does not require a date.

### Markup Suggestion

* `time`

### Extraction Path

<dl>
<dt>RSS</dt>
<dd><code>rss > channel > item > pubDate</code></dd>
<dt>Atom</dt>
<dd><code>feed > entry > published</code></dd>
<dt>JSON Feed</dt>
<dd><code>object["items"][0].date_published</code></dd>
</dl>
