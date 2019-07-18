# Frame Timing Use Cases 
Purpose of this document is to describe use cases which may be relevant to FrameTiming web API (https://wicg.github.io/frame-timing/) as a reference. 

## Use case 1 – Troubleshoot slow UI responsiveness and animations  
There are cases when users complain about certain actions in the UI being “slow”, “stuck”, “not smooth”. 
It is not trivial to troubleshoot these cases, particularly when there is no local repro for the engineer investigating this.
A big challenge is to understand what has caused long frames in terms of specific code executed or rendering inefficiencies.

## Use case 2 – Collect RUM over time about user actions
We would like create KPIs to track our users experience over time in terms of long frames. One of the main challenges is to understand what happened during those long frames. For example if a user clicks a button which results in long frames due to long JS or rendering it is important to know that the click happened in time proximity to the long frame since it could be related.

## Use case 3 – identify regressions related to JS and rendering 
An engineer builds a web feature / fixes a bug and wants to know if it has regressed JS execution times or introduced rendering overhead, like layout thrashing. We can measure long tasks (JS) but not full frames and the actual rendering time in the frames. It is also not trivial to correlate long tasks with long frame and long rendering times. 
