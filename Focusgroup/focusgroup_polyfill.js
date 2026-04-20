
/*
 * focusgroup (HTML attribute) polyfill
 */



/* Architectural overview
 * focusgroupManager attaches (weakmap) to every element that has a focusgroup attribute.
 * each manager registers a keyboard event handler to catch arrow key (and other nav) input.
 * focusgroups become aware of other focusgroups and handle extension and ascent/descent cases.
 * focusgroups do not capture any state, they do their best to move focus to the next available
 *  focusable thing in realtime (so that any interim mutations can be handled).
 * focusgroup movement is done in a microtask checkpoint to attempt to be the "last" thing done
 *  by a keyboard event.
 */

/* Process
 * on load, any pre-existing focusgroup attributes have their managers created. Mutation observer
 *  is registered to catch and apply the focusgroup manager to any newly added attributes.
 */

/* Requirements
 * JS
 *  class support
 *  WeakMap
 *  ?. syntax
 *  Symbol.for
 * DOM
 *  Mutation Observer
 *  addEventListener (once)
 *  queueMicrotask
 */




class FocusGroupManager {
  constructor( node, settingsString ) {
    this.settings = {
      wrap: settingsString.includes( " wrap " ),
      horizontal: settingsString.includes( " horizontal "),
      vertical: settingsString.includes( " vertical "),
      extends: settingsString.includes( " extends "),
      node: node      // The node containing this focusgroup
    };
    if ( !this.settings.horizontal && !this.settings.vertical ) {
      this.settings.horizontal = this.settings.vertical = true; // Set both to true if neither specified.
    }
    FocusGroupManager.register();
    // TODO: try to infer writing mode/direction of content, adjust setting to match
  }
  /*
   * From this focusgroup, enumerate the prev/next possibilities
   */
  buildCandidates( focusNode, orientation, dir ) {
    const collectNextSiblingsInclusive = ( node ) => {
      let nextSiblings = [ node ];
      while ( node.nextElementSibling ) {
        nextSiblings.push( node.nextElementSibling );
        node = node.nextElementSibling;
      }
      return nextSiblings;
    };
    const findFocusGroupExtendingRoot = ( focusGroupSearch ) => {
      // Find the root of the current extending focusgroup [tree]
      let rootFocusGroup = focusGroupSearch;
      while ( focusGroupSearch?.settings?.extends && focusGroupSearch.settings[orientation] ) { // Only pull-in orientationally-compatible parents...
        // Add relevant parent nodes (if any)
        focusGroupSearch = FocusGroupManager.get( focusGroupSearch.settings.node.parentNode );
        if ( focusGroupSearch && focusGroupSearch.settings[orientation] ) { // Only aligned orientation focus groups are considered.
          rootFocusGroup = focusGroupSearch;
        }
      }
      return rootFocusGroup;
    };
    const treeIteratorCandidateBuilder = ( toVisit, startNode ) => {
      // begin deep traversal for toVisit
      let candidates = [];
      var offset = 0;
      while ( toVisit.length > 0 ) {
        let n = toVisit.shift();
        candidates.push( n );
        if ( n == startNode ) {
          offset = candidates.length - 1;
        }
        // Does n have an extending focusgroup?
        let fg = FocusGroupManager.get( n );
        if ( fg?.settings?.extends && fg?.settings?.[orientation] && n.firstElementChild ) { // As long as it extends AND is orientationaly-aligned...(and has children)
          toVisit = collectNextSiblingsInclusive( n.firstElementChild ).concat( toVisit );
        }
      }
      return { offset, candidates };
    };
    let localRoot = findFocusGroupExtendingRoot( this );
    if ( localRoot.settings[orientation] ) { // If this local root is axis-aligned with the desired direction, then add its candidate nodes
      let { offset, candidates } = treeIteratorCandidateBuilder( collectNextSiblingsInclusive( localRoot.settings.node.firstElementChild ), focusNode );
      return { offset, candidates, wrap: localRoot.settings.wrap }; // intra-candidate navigation, either 'dir' supported.
    }
    else {
      // the local root does not support the desired orientation, check the dir for possible ascent or descent...
      if ( dir == "backward" && localRoot.settings.extends ) {
        let ascenderRoot = FocusGroupManager.get( localRoot.settings.node.parentNode );
        if ( !ascenderRoot ) {
          return { offset: 0, candidates: [], wrap: false };
        }
        ascenderRoot = findFocusGroupExtendingRoot( ascenderRoot ); // Get full extent of it...
        let toVisitPrevious = collectNextSiblingsInclusive( ascenderRoot.settings.node.firstElementChild );
        let { candidates, offset } = treeIteratorCandidateBuilder( toVisitPrevious, localRoot.settings.node );
        candidates.splice( ++offset, 0, focusNode );
        return { offset, candidates, wrap: ascenderRoot.settings.wrap };
      }
      else if ( dir == "forward" && focusNode.firstElementChild ) {
        // Also check the current focusNode... if it has a focusgroup in the given orientation it is compatible for 'next' iteration.
        let { offset, candidates } = treeIteratorCandidateBuilder( [focusNode], focusNode );
        return { offset, candidates, wrap: false };
      }
      else {
        return { offset: 0, candidates: [], wrap: false };
      }
    }
  }
  /*
   * Add a focusgroup to a node (if there is already one there, it replaces it.)
   */
  static add( node ) {
    if ( focusgroupManagers.has( node ) ) {
      FocusGroupManager.remove( node );
    }
    focusgroupManagers.set( node, new FocusGroupManager( node, ` ${ node.getAttribute( "focusgroup" ) } ` ) ); // Add whitespace around the bounds to be able to perform whole-word search for robustness
  }
  /*
   * Drop a focusgroup from a node
   */
  static remove( node ) {
    focusgroupManagers.delete( node );
  }
  /*
   * Get a focusgroup manager (if available)
   */
  static get( node ) {
    let fgInstance = focusgroupManagers.get( node );
    if ( fgInstance == undefined ) {
      return null;
    }
    else {
      return fgInstance;
    }
  }
  /*
   * Registers (once) the keyboard handler for all FocusGroups instances in the document
   */
  static register()
  {
    let symKey = Symbol.for("focusgroup-polyfill-one-time-event-handler-symbol");
    if ( this[symKey] ) {
      return; // Already setup.
    }
    this[symKey] = true;
    self.addEventListener( "keydown" , ( event ) => {
      if ( event.defaultPrevented ) {
        return;
      }
      const focusTarget = event.target;
      const key = event.code;
      let focusGroup = FocusGroupManager.get( focusTarget.parentNode );
      if ( !focusGroup ) {
        return; // ignore this event--not within the scope of a focusgroup
      }
      if ( key != "ArrowUp" && key != "ArrowDown" && key != "ArrowLeft" && key != "ArrowRight" ) {
        return; // not the key I'm looking for
      }
      let orientation = "horizontal";
      if ( key == "ArrowUp" || key == "ArrowDown" ) {
        orientation = "vertical";
      }
      let direction = "forward";
      if ( key == "ArrowUp" || key == "ArrowLeft" ) {
        direction = "backward";
      }
      let { offset, candidates, wrap } = focusGroup.buildCandidates( focusTarget, orientation, direction );
      if ( candidates.length <= 1 ) {
        return; // Nothing to change focus to but itself (or nothing at all found).
      }
      var newTarget = null;
      // Search for the next target in the specified direction.
      while ( direction == "forward" && offset < candidates.length ) {
        offset++;
        if ( offset == candidates.length ) {
          if ( wrap ) {
            offset = 0;
          }
          else {
            return; // Reached the end of the focusable list going this direction.
          }
        }
        if ( candidates[offset] == focusTarget ) {
          return; // The search has completely wrapped around without finding anything...
        }
        if ( this.isFocusable( candidates[offset] ) ) {
          newTarget = candidates[offset];
          break;
        }
      }
      while ( direction == "backward" && offset >= 0 ) {
        offset--;
        if ( offset == -1 ) {
          if ( wrap ) {
            offset = candidates.length - 1;
          }
          else {
            return; // reached the end.
          }
        }
        if ( candidates[offset] == focusTarget ) {
          return; // The search has completely wrapped around without finding anything...
        }
        if ( this.isFocusable( candidates[offset] ) ) {
          newTarget = candidates[offset];
          break;
        }
      }
      queueMicrotask( () => {
        newTarget.focus();
      } );
    } );
  }
  static isFocusable ( node ) {
    if ( node.hasAttribute( "tabindex" ) )
      return true;
    if ( node.nodeName == "A" && node.hasAttribute( "href" ) )
      return true;
    if ( node.nodeName == "BUTTON" && !node.hasAttribute( "disabled" ) )
      return true;
    if ( node.nodeName == "INPUT" && node.type != "hidden" && !node.hasAttribute( "disabled" ) )
      return true;
    if ( node.nodeName == "SELECT" && !node.hasAttribute( "disabled" ) )
      return true;
    if ( node.nodeName == "TEXTAREA" && !node.hasAttribute( "disabled" ) )
      return true;
    if ( node.contentEditable === "true" )
      return true;
    if ( node.nodeName == "IFRAME" )
      return true;
    return false;
  }
}



/*
 * Attache focus group managers to existing attributes, and setup observers
 * for any new ones that will appear over time
 */
function OneTimeInit() {
  [].forEach.call( document.querySelectorAll( "[focusgroup]" ), ( node ) => {
    FocusGroupManager.add( node );
  } );
  new MutationObserver( ( records ) => {
    records.forEach( ( record ) => {
      if ( record.target.hasAttribute( "focusgroup" ) ) {
        // This attribute was added/changed (reprocess)
        FocusGroupManager.add( record.target );
      }
      else {
        // The focusgroup was removed
        FocusGroupManager.remove( record.target );
      }
    } );
   } ).observe( document, { subtree: true, attributes: true, attributeFilter: [ "focusgroup" ] } );
}

/*
 * Begin execution here
 */

const focusgroupManagers = new WeakMap();

if ( document.readyState != "complete" ) {
  document.addEventListener('DOMContentLoaded', OneTimeInit, { once: true } );
}
else {
  OneTimeInit(); // run right now.
}
