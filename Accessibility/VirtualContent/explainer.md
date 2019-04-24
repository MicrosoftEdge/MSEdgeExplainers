# ARIA Virtual Content

Author: [Kevin Babbitt](https://github.com/kbabbitt)

Last updated: 2019-04-23

## Introduction

*Virtualized content* allows an author to efficiently represent a large body of information at once. In this practice, only a
fraction of the information is actually present in the markup - typically the portion that is currently visible, plus a small amount
preceding or following in order to allow for scrolling. As the user scrolls the web page, JavaScript code will load more content and
insert it into the markup at the appropriate location. This process is referred to as *realizing* the content.

Virtualized content presents challenges for users of assistive technologies (ATs). Generally, an AT's view of the document is limited
to what is physically present in the markup. Without some indication that further content exists, the AT cannot accurately describe and
navigate the web page. For example, some ATs allow the user to skim the headings in a document by jumping from one to the next. After
reading the last realized heading, the AT has no way of knowing that another heading might exist in virtualized content, nor does it
have a way of discovering that there is even virtualized content to begin with. The AT, and the user, thus incorrectly conclude that the
last heading in the document has been reached.

## Goals

* Enable ATs to recognize and account for virtualized content when navigating a web page.
* Protect the privacy of AT users by avoiding mechanisms that would allow for fingerprinting.

## Proposed API

A new attribute, `aria-virtualcontent`, indicates whether an element contains virtualized content. The default value is `none`.

A **virtual content container** is any element that has a non-default value for `aria-virtualcontent`.

A **virtual content edge** is an edge of a virtual content container where the webpage can realize content.

The `aria-virtualcontent` attribute can have one of several keyword values, or multiple values separated by spaces, establishing which edges of the container are virtual content edges: `block-end`, `block-start`, `inline-end`, `inline-start`.
*(Future expansion of the attribute value may provide hint(s) about the nature of the virtualized content. ATs could use this information when implementing features such as "navigate to next heading" or "next table" etc.)*

Marking an element as a virtual content container establishes a contract between the web page and ATs. Specifically:
* If the virtual content container is also a [scroll container](https://www.w3.org/TR/css-overflow-3/#scroll-container), the web page ***MUST*** begin steps to realize content no later than when the virtual content container is scrolled to a limit where a virtual content edge exists.
* If the virtual content container is not a [scroll container](https://www.w3.org/TR/css-overflow-3/#scroll-container), the web page ***MUST*** begin steps to realize content no later than when a virtual content edge enters the [scrollport](https://www.w3.org/TR/css-overflow-3/#scrollport) of its nearest ancestor [scroll container](https://www.w3.org/TR/css-overflow-3/#scroll-container).

## Example Use

The following simplified example shows one potential usage pattern for `aria-virtualcontent`.

```
<html>
<head>
  <script src="virtualcontent.js"></script>
</head>
<body>
  <main id="main" aria-virtualcontent="block-end">
    <h1>Section 1</h1>
      ...
    <h1>Section 2</h1>
      <h2>Section 2.1</h2>
      ...
    <!-- etc... --->
    <div id="loading_spinner" role="presentation" style="visibility:hidden">
      <img src="loading.gif" role="presentation">
    </div>
  </main>
  <div id="announcer" aria-live="assertive" style="width: 0; height: 0; overflow: hidden"></div>
</body>
</html>
```

virtualcontent.js:
```
// Issues a request to the server for the next section of content.
function begin_load_next_section() {
  // Issue request to server.
  // ...
}

// Callback triggered when the server responds with next section of content.
function end_load_next_section(response) {
  // Insert response payload into the DOM.
  document.getElementById("main").appendChild(...);

  // Signal to the user that we're done loading.
  document.getElementById("loading_spinner").style.visibility = "hidden";
  document.getElementById("announcer").textContent = "Next section loaded.";

  // Update the state of the virtual content container.
  if (response.isAtEndOfDocument) {
      document.getElementById("main").removeAttribute("aria-virtualcontent");
  }
}

// Listens for scroll events and responds accordingly.
function on_scroll_changed() {
  // Check whether the user has scrolled to the bottom of the page.
  let target = document.documentElement;
  let top = (target && target.scrollTop) || document.body.scrollTop;
  if (top + target.clientHeight >= target.scrollHeight) {
    // Issue request to the server.
    begin_load_next_section();

    // Signal to the user that we're loading more content.
    document.getElementById("loading_spinner").style.visibility = "visible";
    document.getElementById("announcer").textContent = "Loading additional content.";
  }
}

// Initialize scroll handler.
window.addEventListener("scroll", on_scroll_changed);
```

### Walkthrough

#### Initial Conditions
* The web page is in a steady state.
* The `main` element is partially visible in the viewport. This element's bottom edge is below the bottom edge of the viewport. Because it has `aria-virtualcontent` set, it is a virtual content container.
* An AT has its reading cursor on the last heading element inside the virtual content container.

#### Scenario
1. The user directs the AT to navigate to the next heading in the document.
2. Using the platform accessibility API, the AT searches the web page for a subsequent heading. It finds none.
3. The AT searches the parent chain of the last heading element (i.e. the current location of its reading cursor). It finds the `main` element and sees that it is a virtual content container.
4. The AT reacts to the presence of a virtual content container by looking for a scrollable element, starting with the virtual content container itself and searching the parent chain from there. It finds the scroller for the document itself and asks the user agent to scroll to the bottom of the page. *(Privacy note: APIs already exist on some operating systems that allow an AT to do this without fingerprinting the user.)*
5. The user agent scrolls as requested by the AT and generates a scroll event.
6. The `on_scroll_changed()` function is called in reaction to the scroll event. Script code issues a request to a backing server for additional content, displays a loading spinner, and announces that additional content is being loaded using an ARIA live region.
7. The backing server sends back a payload with additional content. Upon receiving the payload, the `end_load_next_section()` function is called. Script code inserts the new content into the DOM at the bottom of the virtual content container, hides the loading spinner, and announces to the user that additional content is available.
8. The user agent notifies the platform accessibility API that the web page content has changed.
9. The user hears the announcement that new content has been loaded. He/she once again directs the AT to navigate to the next heading.
10. Using the platform accessibility API, the AT searches the web page for a subsequent heading.
11. The AT finds a heading in the newly loaded content, moves its reading cursor to that heading, and reads the heading to the user.
12. The user continues navigating through document headings in the same fashion.
13. Eventually, the backing server sends a content payload which also contains a signal that the end of the document has been reached. Script code removes the `aria-virtualcontent` attribute from the `main` element to indicate there is no more virtualized content.
14. The next time the user attempts to navigate to the next heading, the AT searches for a virtual content container, finds none, and announces there are no further headings in the document.

## Alternate solutions

### The `feed` role

[WAI ARIA 1.1](https://www.w3.org/TR/wai-aria-1.1/) defines the [`feed`](https://www.w3.org/TR/wai-aria-1.1/#feed) role, which
implements one solution for allowing ATs to interact with virtualized content, in the context of a scrollable list of articles.
However, `feed` has limitations:
* Because it is implemented as a role, it cannot coexist with other roles. This limits its applicability - for example, one might
imagine virtualizing portions of a spreadsheet whose role is best defined as `table` or `grid`.
* There is no explicit indication that virtualized content exists; in other words it does not allow the AT to distinguish between
the end of realized content and the actual end of content. This can result in the AT giving incorrect cues to the user as described
in the introduction.
