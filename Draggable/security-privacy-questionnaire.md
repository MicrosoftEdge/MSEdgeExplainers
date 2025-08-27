# [Self-Review Questionnaire: Security and Privacy](https://w3c.github.io/security-questionnaire/)

01.  What information does this feature expose,
     and for what purposes?
    
    None.

02.  Do features in your specification expose the minimum amount of information
     necessary to implement the intended functionality?

    Doesn't expose any information.

03.  Do the features in your specification expose personal information,
     personally-identifiable information (PII), or information derived from
     either?

    No.

04.  How do the features in your specification deal with sensitive information?

    The feature doesn't deal with any sensitive information.

05.  Does data exposed by your specification carry related but distinct
     information that may not be obvious to users?

    No.

06.  Do the features in your specification introduce state
     that persists across browsing sessions?

    No.

07.  Do the features in your specification expose information about the
     underlying platform to origins?

    No.

08.  Does this specification allow an origin to send data to the underlying
     platform?

    No.

09.  Do features in this specification enable access to device sensors?

    No.

10.  Do features in this specification enable new script execution/loading
     mechanisms?

    No.

11.  Do features in this specification allow an origin to access other devices?

    No.

12.  Do features in this specification allow an origin some measure of control over
     a user agent's native UI?

    Yes. The `app-region` property allows a DOM element to be a source from where to drag and move a window around in the screen if the platform's default UX is not present.


13.  What temporary identifiers do the features in this specification create or
     expose to the web?

    None.

14.  How does this specification distinguish between behavior in first-party and
     third-party contexts?

    N/A.

15.  How do the features in this specification work in the context of a browser’s
     Private Browsing or Incognito mode?

    Apps can't be installed in these modes, therefore it's N/A.

16.  Does this specification have both "Security Considerations" and "Privacy
     Considerations" sections?

    Yes.
    
17.  Do features in your specification enable origins to downgrade default
     security protections?

    No.

18.  What happens when a document that uses your feature is kept alive in BFCache
     (instead of getting destroyed) after navigation, and potentially gets reused
     on future navigations back to the document?

    N/A.

19.  What happens when a document that uses your feature gets disconnected?

    Feature still works.

20.  Does your spec define when and how new kinds of errors should be raised?

    N/A.

21.  Does your feature allow sites to learn about the user's use of assistive technology?

    No.

22.  What should this questionnaire have asked?

    N/A.