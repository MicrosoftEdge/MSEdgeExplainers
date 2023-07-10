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
            this._register  = this._shadow.querySelector('.trial-card__registration-button');
        }

        connectedCallback() {
            // Set initial values of elements based on attributes
            let heading     = this.getAttribute("label");
            let explainer   = this.getAttribute("explainer");
            let expires     = this.getAttribute("expires");
            let issue       = this.getAttribute("issue");

            this._heading.innerHTML = heading;
            this._expires.innerHTML = expires;

            this._explainer.setAttribute('href', explainer);

            if (issue != null && issue.length > 0) {
                this._badge.setAttribute('href', this.getIssueLink(issue));

                let img = document.createElement('img');
                img.src = this.getIssueBadgeLink(issue);

                this._badge.appendChild(img)
            } else {
                this._badge.setAttribute('href', this.getGenericIssueLink(heading));

                let img = document.createElement('img');
                img.src = this.getIssueBadgeLink('OriginTrialFeedback');

                this._badge.appendChild(img);
            }

            this._register.addEventListener('click', () => window.open(REGISTRATION_LINK, '_blank'))
        }

        attributeChangedCallback(name, previous, current) {
            console.log(`${name} ${previous} ${current}`);
        }

        getIssueBadgeLink(tag) {
            let encoded = encodeURI(tag);
            return `https://img.shields.io/github/issues/MicrosoftEdge/MSEdgeExplainers/${encoded}?label=issues`;
        }

        getIssueLink(tag) {
            let encoded = encodeURI(tag);
            let label = tag.replace(' ', '+')
            return `https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?labels=${label},OriginTrialFeedback&title=%5B${encoded}%5D+Feedback`
        }

        getGenericIssueLink(name) {
            let encoded = encodeURI(name);
            return `https://github.com/MicrosoftEdge/MSEdgeExplainers/issues/new?labels=OriginTrialFeedback&title=%5B${encoded}%5D+Feedback`;
        }
    }

    customElements.define('trial-card', TrialCard);
}