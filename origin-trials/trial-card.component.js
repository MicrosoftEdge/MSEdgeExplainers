fetch("trial-card.component.html")
    .then( stream => stream.text() )
    .then( text => define(text) );

const REGISTRATION_LINK = "https://aka.ms/origin-trial-registration"

function define(template) {
    class TrialCard extends HTMLElement {
        constructor() {
            super();

            this._shadow = this.attachShadow({ mode: "open" });                    
            this._shadow.innerHTML = template;

            // Store references to internal components
            this._heading   = this._shadow.querySelector('.trial-card__title');
            this._explainer = this._shadow.querySelector('.trial-card__explainer');
            this._expires   = this._shadow.querySelector('.trial-card__expires');
            this._badge     = this._shadow.querySelector('.trial-card__issue-badge');
            this._feedback  = this._shadow.querySelector('.trial-card__feedback');
            this._register  = this._shadow.querySelector('.trial-card__registration-button');
        }

        connectedCallback() {
            // Set initial values of elements based on attributes
            let heading      = this.getAttribute("label");
            let explainer    = this.getAttribute("explainer");
            let expires      = this.getAttribute("expires");
            let repo         = this.getAttribute("repo");
            let issue        = this.getAttribute("issue");
            let feedbackLink = this.getAttribute("feedbackLink");
            let isUpstream   = this.getAttribute("upstream"); 

            this._heading.innerHTML = heading;
            this._expires.innerHTML = expires;

            this._explainer.setAttribute('href', explainer);

            if (feedbackLink != null) {
                this._feedback.setAttribute('href', feedbackLink);

                this._badge.style.display = "none";
                this._feedback.style.display = "inline";
            } else if (issue != null && issue.length > 0) {
                this._badge.setAttribute('href', this.getIssueLink(repo, issue));
                this._badge.setAttribute('aria-label', `Feedback link for ${heading}`);

                let img = document.createElement('img');
                if (isUpstream === "false") {
                    img.src = this.getIssueBadgeLink(repo, issue);
                } else {
                    img.src = this.getIssueBadgeLink(repo, "");
                }

                this._badge.appendChild(img)
            } else {
                this._badge.setAttribute('href', this.getGenericIssueLink(repo, heading));
                this._badge.setAttribute('aria-label', `Feedback link for ${heading}`);

                let img = document.createElement('img');
                if (isUpstream === "false") {
                    img.src = this.getIssueBadgeLink(repo, 'OriginTrialFeedback');
                } else {
                    img.src = this.getIssueBadgeLink(repo, "");
                }

                this._badge.appendChild(img);
            }

            this._register.addEventListener('click', () => window.open(REGISTRATION_LINK, '_blank'))
        }

        attributeChangedCallback(name, previous, current) {
            console.log(`${name} ${previous} ${current}`);
        }

        getIssueBadgeLink(repo, tag) {
            let encodedTag = tag.length > 0 ? `/${encodeURI(tag)}` : "";
            return `https://img.shields.io/github/issues/${repo}${encodedTag}?label=issues`;
        }

        getIssueLink(repo, tag) {
            let encodedTag = encodeURI(tag);
            let label = tag.replace(' ', '+')
            return `https://github.com/${repo}/issues/new?labels=${label},OriginTrialFeedback&title=%5B${encodedTag}%5D+Feedback`
        }

        getGenericIssueLink(repo, name) {
            if (repo === "MicrosoftEdge/MSEdgeExplainers") {
                let encodedName = encodeURI(name);
                return `https://github.com/${repo}/issues/new?labels=OriginTrialFeedback&title=%5B${encodedName}%5D+Feedback`;
            } else {
                return `https://github.com/${repo}/issues/new`;
            }

        }
    }

    customElements.define('trial-card', TrialCard);
}