if (document.readyState != 'loading') {
    onload();
} else {
    document.addEventListener('DOMContentLoaded', onload);
}

async function onload() {
    await populateActiveTrialList();
}

async function populateActiveTrialList() {

    let trials = await fetch('trials.json')
        .then( stream => stream.json() )

    let active = trials["active"];

    let section = document.querySelector("#active-trials-section");

    active.forEach( trial  => {
        let label       = trial["label"];
        let expires     = trial["expiration"];
        let explainer   = trial["explainer"];
        let issue       = trial["issue"];

        let card = document.createElement("trial-card");

        card.setAttribute("label", label);
        card.setAttribute("expires", expires);
        
        if (explainer != undefined) {
            card.setAttribute("explainer", explainer);
        }

        if (issue != undefined) {
            card.setAttribute("issue", issue);
        }

        section.appendChild(card);
    });
}