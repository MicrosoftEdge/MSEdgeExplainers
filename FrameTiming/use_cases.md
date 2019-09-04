# Frame Timing Use Cases 
Purpose of this document is to describe use cases which may be relevant to FrameTiming web API (https://wicg.github.io/frame-timing/) as a reference for spec definition. 

## Use case 1 – Troubleshoot slow UI responsiveness and animations  
There are cases when web application users complain about certain actions in the UI being “slow”, “stuck”, “not smooth”. 
It is not trivial to troubleshoot and diagnose these cases, particularly when there is no local repro for the engineer investigating this.
A big challenge is to understand what has caused long frames in terms of specific code executed or rendering inefficiencies.
The frame timing API could provide indication that long frames have occured during certain time, while including some relevant user action context for further correlation and analysis.

## Use case 2 – Collect RUM over time about user actions
When building web applications it is a common practice to build KPIs based on Real User Monitoring data to track the overall user experience.
We would like create KPIs to track our users experience over time in terms of long frames. One of the main challenges besides detecting that a long frame occured is to understand what happened during those long frames. For example if a user clicks a button which results in long frames due to long JS or rendering it is important to know that the click happened in the same frame as the long frame since it is likely related.

## Use case 3 – Identify regressions related to JS and rendering 
When an engineer builds a feature / fixes a bug in a web app code they want to know if it they introduced UX regressions with increased JS execution times or introduced rendering overhead, such as layout thrashing. It is possible to measure long tasks (long JS execution time) using Long Tasks Observer API [https://w3c.github.io/longtasks/] but not the full frames and the actual rendering time in those frames. It is also not trivial to correlate long tasks with long frame and long rendering times. 
