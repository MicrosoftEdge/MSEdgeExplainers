# Early Self-Review Questionnaire: Security and Privacy

## Security and Privacy questionnaire for [`SetDefaultSearchEngine`](explainer.md)

1. **What information might this feature expose to Web sites or other parties, and for what purposes is that exposure necessary?**

    This feature exposes information to the origin if the web site from a search provider.

    It is necessary to allow SERP page from a search provider to set itself as default search engine for the browser.

2. **Do features in your specification expose the minimum amount of information necessary to enable their intended uses?**

    Yes.

3. **How do the features in your specification deal with personal information, personally-identifiable information (PII), or information derived from them?**

    There is no information of this type being handled by the feature.

4. **How do the features in your specification deal with sensitive information?**

    There is no sensitive information handled by the feature. 

5. **Do the features in your specification introduce new state for an origin that persists across browsing sessions?**

    No, this feature does not introduce new states tied to an origin.

6. **Do the features in your specification expose information about the underlying platform to origins?**

    No.

7. **Does this specification allow an origin to send data to the underlying platform?**

    No.

8. **Do features in this specification enable access to device sensors?**

    No.

9. **Do features in this specification enable new script execution/loading mechanisms?**

    No.

10. **Do features in this specification allow an origin to access other devices?**

    No.

11. **Do features in this specification allow an origin some measure of control over a user agent’s native UI?**

    No.

12. **What temporary identifiers do the features in this specification create or expose to the web?**

    None.

13. **How does this specification distinguish between behavior in first-party and third-party contexts?**

    It does not make such distinction.

14. **How do the features in this specification work in the context of a browser’s Private Browsing or Incognito mode?**

    No difference.

15. **Does this specification have both "Security Considerations" and "Privacy Considerations" sections?**

    The API does not introduce any new security or privacy considerations.

16. **Do features in your specification enable origins to downgrade default security protections?**

    No.

17. **How does your feature handle non-"fully active" documents?**

    No difference.

18. **What should this questionnaire have asked?**

    N/A.