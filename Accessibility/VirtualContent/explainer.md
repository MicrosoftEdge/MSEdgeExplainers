# ARIA Virtual Content

Author: [Kevin Babbitt](https://github.com/kbabbitt)

Last updated: 2019-05-09

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

## Example 1: Document with Headings

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

## Example 2: Tabular data

This example illustrates one use of `aria-virtualcontent` for virtualized content in the inline direction. The document in this scenario is a table of bug reports with the following columns: report ID, report date, status, assigned to, title, fix date, fixed by.

In a fully-realized table, a typical AT would walk the table in row-major order, stopping and reading out each cell in turn. In this example, the content author has incorporated script that keeps only a subset of columns realized depending on viewport width, and the viewport width is such that the script will keep no more than five columns realized at a time. The AT achieves the same reading order as for a fully-realized table by checking for virtualized content in the inline direction whenever it's ready to advance from the last realized cell in a row.

```
<html>
<body>
<table aria-virtualcontent="block-end inline-end" aria-colcount="7">
  <thead>
    <tr>
      <th>ID</th>
      <th>Status</th>
      <th>Assigned To</th>
      <th>Report Date</th>
      <th>Title</th>
 <!-- <th>Fix Date</th> - Virtualized -->
 <!-- <th>Fixed By</th> - Virtualized -->
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>338</td>
      <td>Closed</td>
      <td>Alice</td>
      <td>April 21</td>
      <td>Widget freezes up when the network is slow</td>
 <!-- <td>Fix Date</td> - Virtualized -->
 <!-- <td>Fixed By</td> - Virtualized -->
    </tr>
    <tr>
      <td>342</td>
      <td>Fixed</td>
      <td>Bob</td>
      <td>April 22</td>
      <td>Crash when shift-double-clicking the widget</td>
 <!-- <td>Fix Date</td> - Virtualized -->
 <!-- <td>Fixed By</td> - Virtualized -->
    </tr>
  </tbody>
</table>
</body>
</html>
```

Backing script performing similar functions as Example 1's virtualcontent.js is assumed to be present.

### Walkthrough

An AT navigating the above content by table cells might result in the following flow:
1. The AT stops on and reads out each of the five realized cells in the header row.
2. Upon reaching the end of the row, the AT discovers that the table has virtualized content in the inline-end direction and scrolls the document in that direction.
3. Backing script realizes headers and data for the "Fix date" and "Fixed by" columns. It also virtualizes headers and data for the "ID" and "Status" columns. There are no longer any virtualized columns in the inline-end direction, but there are now virtualized columns in the inline-start direction. Accordingly, in the table's `aria-virtualcontent` attribute, script replaces the `inline-end` token with  `inline-start`.
4. The AT stops on and reads out the two newly realized cells in the header row.
5. Upon reaching the end of the row, the AT discovers that the table no longer contains virtualized content in the inline-end direction. The next realized cell is the "Assigned To" cell in the row for bug 338. However, the table contains virtualized content in the inline-start direction, so the AT recognizes that the next realized cell is not the next cell in the overall table. The AT notes to itself that it is moving into the row for bug 338 and scrolls the document in the inline-start direction.
6. Backing script realizes headers and data for the "ID" and "Status" columns. It also virtualizes headers and data for the "Fix date" and "Fixed by" columns. There are no longer any virtualized columns in the inline-start direction, but there are now virtualized columns in the inline-end direction. Accordingly, in the table's `aria-virtualcontent` attribute, script replaces the `inline-start` token with  `inline-end`.
7. The AT moves to the first realized cell in the row for bug 338. In turn, it stops on and reads out each of the realized cells in that row.
8. After reading the last realized cell in the row for bug 338, the AT checks for virtualized content in the inline-end direction and finds there is some. It scrolls the document in the inline-end direction.
9. Backing script realizes content in the inline-end direction, virtualizes content in the inline-start direction, and updates the table's `aria-virtualcontent` attribute, the same as in step 3.
10. The AT stops on and reads out the two newly realized cells in the row for bug 338.
11. Upon reaching the end of the row, the AT discovers that the table no longer contains virtualized content in the inline-end direction, then moves on to the next row (the row for bug 342) and checks for virtualized content in the inline-start direction, the same as in step 5.
12. Backing script realizes content in the inline-start direction, virtualizes content in the inline-end direction, and updates the table's `aria-virtualcontent` attribute, the same as in step 6.
13. The AT stops on and reads out each cell in the row for bug 342, scrolling as necessary to realize additional cells. The flow is the same as for the previous row, as outlined in steps 7-10.
14. After reading the last cell in the row for bug 342, the AT discovers that the table no longer contains virtualized content in the inline-end direction. It looks for another row in the table and finds there are no more realized rows.
15. However, the AT also discovers that the table has virtualized content in the block-end direction. The AT issues two scroll requests: first in the inline-start direction to return to the first columns in the table, then in the block-end direction to load additional rows.
16. Backing script realizes the next few rows in the table, and the AT continues reading.

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

---
[Related issues](https://github.com/MicrosoftEdge/MSEdgeExplainers/labels/Virtual%20Content) | [Open a new issue](https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?title=%5BVirtual%20Content%5D)
