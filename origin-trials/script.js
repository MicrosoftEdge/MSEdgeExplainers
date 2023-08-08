if (document.readyState != 'loading') {
    onload();
} else {
    document.addEventListener('DOMContentLoaded', onload);
}

async function onload() {
  let edgeSection = document.querySelector("#edge-active-trials-section");
  let chromeSection = document.querySelector("#chrome-active-trials-section");
  await populateActiveTrialList('downstream-trials.json', edgeSection, /*isUpstream=*/false);
  await populateActiveTrialList('upstream-trials.json', chromeSection, /*isUpstream=*/true);
}

async function populateActiveTrialList(trialsFile, section, isUpstream) {

    let trials = await fetch(trialsFile)
        .then( stream => stream.json() )

    let active = trials["active"];

    active.forEach( trial  => {
        let label        = trial["label"];
        let expires      = trial["expiration"];
        let explainer    = trial["explainer"];
        let repo         = trial["repo"];
        let issue        = trial["issue"];
        let feedbackLink = trial["feedbackLink"];

        let card = document.createElement("trial-card");

        card.setAttribute("label", label);
        card.setAttribute("expires", expires);
        card.setAttribute("explainer", explainer);
        card.setAttribute("repo", repo);
        card.setAttribute("upstream", isUpstream);

        if (feedbackLink != undefined) {
            card.setAttribute("feedbackLink", feedbackLink);
        }

        if (issue != undefined) {
            card.setAttribute("issue", issue);
        }

        section.appendChild(card);
    });
}