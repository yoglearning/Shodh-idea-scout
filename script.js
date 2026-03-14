let generatedChallenges = [];
let currentChallengeIndex = -1;
let currentChallenge = null;
let acceptedChallenges = JSON.parse(localStorage.getItem("acceptedChallenges")) || [];
let skippedChallenges = JSON.parse(localStorage.getItem("skippedChallenges")) || [];
let userSubreddits = JSON.parse(localStorage.getItem("userSubreddits")) || [];
let seenCount = parseInt(localStorage.getItem("seenCount")) || 0;

// Generate a unique ID for each accepted challenge
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", async () => {
    const card = document.getElementById("challengeCard");
    const challengeTextElem = document.getElementById("challengeText");
    const whyTextElem = document.getElementById("whyText");
    const seenCountElem = document.getElementById("seenCount");
    const acceptedBadge = document.getElementById("acceptedBadge");
    const acceptedList = document.getElementById("acceptedList");

    // Initialize UI
    updateBadge();
    seenCountElem.innerText = seenCount;
    if (window.renderSubreddits) {
        window.renderSubreddits();
    }

    function getNextChallengeIndex() {
        if (generatedChallenges.length === 0) return -1; // No challenges available

        // Filter out challenges that have been skipped or accepted (optional on accepted, but usually desired)
        const availableChallenges = generatedChallenges.filter(ch =>
            !skippedChallenges.includes(ch.id || ch.text) // fallback to text if no ID yet from Reddit
        );

        if (availableChallenges.length === 0) {
            return -1; // All challenges have been skipped
        }

        let randomIndex;
        let selectedChallenge;
        do {
            randomIndex = Math.floor(Math.random() * availableChallenges.length);
            selectedChallenge = availableChallenges[randomIndex];
        } while (availableChallenges.length > 1 && selectedChallenge === currentChallenge);

        // Find the index of this selected challenge in the main array
        return generatedChallenges.indexOf(selectedChallenge);
    }

    function updateDiscoverUI() {
        if (!currentChallenge) return;

        // Smooth transition out
        card.classList.add("fade-out");

        // Collapse the details section
        const detailsElem = document.querySelector(".challenge-details");
        if (detailsElem) detailsElem.removeAttribute("open");

        setTimeout(() => {
            // Update content
            challengeTextElem.innerText = currentChallenge.text;
            whyTextElem.innerText = currentChallenge.why;

            const subredditText = document.getElementById("subredditText");
            const postLink = document.getElementById("postLink");
            const engagementContainer = document.getElementById("engagementContainer");
            const engagementText = document.getElementById("engagementText");
            const dateContainer = document.getElementById("dateContainer");
            const dateText = document.getElementById("dateText");

            if (subredditText) subredditText.innerText = currentChallenge.subreddit || "Unknown";
            if (postLink) {
                postLink.href = currentChallenge.link || "#";
                postLink.style.display = currentChallenge.link !== "#" ? "inline" : "none";
            }
            if (engagementContainer && engagementText) {
                if (currentChallenge.upvotes !== undefined) {
                    engagementContainer.style.display = "flex";
                    engagementText.innerText = `${currentChallenge.upvotes}↑ | ${currentChallenge.comments}💬 | ${currentChallenge.ratio}% Ratio`;
                } else {
                    engagementContainer.style.display = "none";
                }
            }
            if (dateContainer && dateText) {
                if (currentChallenge.date && currentChallenge.date !== "Unknown") {
                    dateContainer.style.display = "flex";
                    dateText.innerText = currentChallenge.date;
                } else {
                    dateContainer.style.display = "none";
                }
            }

            // Update stats
            seenCountElem.innerText = seenCount;

            // Smooth transition in
            card.classList.remove("fade-out");
            card.classList.add("fade-in");

            setTimeout(() => {
                card.classList.remove("fade-in");
            }, 300);
        }, 300);
    }

    function updateBadge() {
        const activeCount = acceptedChallenges.filter(c => c.status !== 'Completed' && c.status !== 'Archived').length;
        acceptedBadge.innerText = activeCount;
        if (activeCount > 0) {
            acceptedBadge.style.display = 'inline-block';
        } else {
            acceptedBadge.style.display = 'none';
        }
    }

    window.renderSubreddits = function () {
        const container = document.getElementById("subredditsContainer");
        if (!container) return;

        container.innerHTML = "";
        userSubreddits.forEach(sub => {
            const chip = document.createElement("div");
            chip.className = "sub-chip";
            chip.innerHTML = `
                r/${sub}
                <span class="remove" onclick="removeCustomSubreddit('${sub}')" title="Remove">&times;</span>
            `;
            container.appendChild(chip);
        });
    };

    window.addCustomSubreddit = function () {
        const input = document.getElementById("customSubs");
        if (!input || input.value.trim() === "") return;

        const parsed = input.value.split(/[\s,]+/)
            .map(s => s.trim().replace(/^r\//i, ''))
            .filter(s => s.length > 0);

        let added = false;
        parsed.forEach(sub => {
            if (!userSubreddits.includes(sub)) {
                userSubreddits.push(sub);
                added = true;
            }
        });

        if (added) {
            localStorage.setItem("userSubreddits", JSON.stringify(userSubreddits));
            input.value = "";
            renderSubreddits();
            refreshRedditChallenges();
        }
    };

    window.removeCustomSubreddit = function (sub) {
        userSubreddits = userSubreddits.filter(s => s !== sub);
        localStorage.setItem("userSubreddits", JSON.stringify(userSubreddits));
        renderSubreddits();
        refreshRedditChallenges();
    };

    // Initialize initial render once available
    renderSubreddits();

    async function fetchRedditChallenges() {
        try {
            const timePeriodSelect = document.getElementById("timePeriod");
            const period = timePeriodSelect ? timePeriodSelect.value : "hot";

            let availableSubs = [...userSubreddits];

            if (availableSubs.length === 0) {
                generatedChallenges = [{
                    text: "No subreddits added.",
                    why: "Please add some subreddits above to fetch challenges from.",
                    subreddit: "System",
                    link: "#"
                }];
                return;
            }

            // Pick up to 3 random subreddits
            const numToPick = Math.min(3, availableSubs.length);
            const shuffledSubs = availableSubs.sort(() => 0.5 - Math.random());
            const selectedSubs = shuffledSubs.slice(0, numToPick);

            let allFrictionPosts = [];

            for (const randomSubreddit of selectedSubs) {
                try {
                    let redditPath = `r/${randomSubreddit}/hot.json?limit=25`;
                    if (period !== "hot") {
                        redditPath = `r/${randomSubreddit}/top.json?t=${period}&limit=50`;
                    }

                    // Append cache buster to prevent browser from returning stale 429s/403s
                    redditPath += `${redditPath.includes('?') ? '&' : '?'}cb=${Date.now()}`;

                    // Use a CORS proxy since Reddit's API blocks direct browser requests
                    const url = `https://thingproxy.freeboard.io/fetch/https://www.reddit.com/${redditPath}`;

                    let response = await fetch(url);

                    // Handle rate limits or other errors explicitly
                    if (!response.ok) {
                        if (response.status === 429) {
                            allFrictionPosts.push({
                                id: generateId(),
                                text: "Reddit API Rate Limit Reached.",
                                why: "You've refreshed too many times quickly. Take a breath and wait a minute before fetching again.",
                                subreddit: randomSubreddit,
                                link: "#"
                            });
                        } else if (response.status === 403 || response.status === 401) {
                            allFrictionPosts.push({
                                id: generateId(),
                                text: "Reddit Blocked the Request (403 Mute).",
                                why: "Reddit is restricting access right now. Try a different network or wait for the block to lift.",
                                subreddit: randomSubreddit,
                                link: "#"
                            });
                        }
                        console.warn(`Reddit API returned ${response.status} for r/${randomSubreddit}`);
                        continue;
                    }

                    let data = await response.json();

                    // Fallback to hot if top returns nothing for the period
                    if (period !== "hot" && (!data || !data.data || !data.data.children || data.data.children.length === 0)) {
                        const fallbackPath = `r/${randomSubreddit}/hot.json?limit=25&cb=${Date.now()}`;
                        const fallbackUrl = `https://thingproxy.freeboard.io/fetch/https://www.reddit.com/${fallbackPath}`;
                        response = await fetch(fallbackUrl);
                        if (!response.ok) continue;
                        data = await response.json();
                    }

                    if (!data || !data.data || !data.data.children) continue;

                    const posts = data.data.children.map(p => p.data);

                    const frictionKeywords = [
                        "how", "why", "can't", "struggling", "problem",
                        "issue", "help", "stuck", "not working", "lost", "need", "advice"
                    ];

                    const frictionPosts = posts.filter(post => {
                        const text = (post.title + " " + (post.selftext || "")).toLowerCase();
                        return frictionKeywords.some(keyword => text.includes(keyword));
                    });

                    let mappedPosts = frictionPosts;
                    let isFallback = false;

                    if (mappedPosts.length === 0 && posts.length > 0) {
                        // If no friction words found, at least give them the top 10 topics from this sub
                        mappedPosts = posts.slice(0, 10);
                        isFallback = true;
                    }

                    const mapped = mappedPosts.map(post => buildChallengeFromPost(post, randomSubreddit, isFallback));
                    allFrictionPosts = allFrictionPosts.concat(mapped);
                } catch (subErr) {
                    console.warn(`Skipping r/${randomSubreddit} due to fetch error:`, subErr);
                    allFrictionPosts.push({
                        id: generateId(),
                        text: `Could not fetch r/${randomSubreddit} — Reddit may be blocking requests.`,
                        why: `Network error: ${subErr.message}. Try a different network, disable ad blockers, or check the subreddit name.`,
                        subreddit: randomSubreddit,
                        link: `https://www.reddit.com/r/${randomSubreddit}`
                    });
                }
            }

            // Shuffle the collected challenges
            allFrictionPosts.sort(() => 0.5 - Math.random());
            generatedChallenges = allFrictionPosts;

            if (generatedChallenges.length === 0) {
                generatedChallenges = [{
                    text: `Scan r/${selectedSubs.join(", r/")} manually and find a problem people are complaining about.`,
                    why: "When automated friction signals are low, you must seek them out.",
                    subreddit: selectedSubs.join(", "),
                    link: "#"
                }];
            }

        } catch (error) {
            generatedChallenges = [{
                text: "Reddit fetch failed. Pick a community and observe a real frustration.",
                why: "Resilience over dependency.",
                subreddit: "Any",
                link: "#"
            }];
        }
    }

    window.refreshRedditChallenges = async function () {
        const challengeTextElem = document.getElementById("challengeText");
        const whyTextElem = document.getElementById("whyText");

        // Visual feedback
        if (challengeTextElem) challengeTextElem.innerText = "Fetching new challenges...";
        if (whyTextElem) whyTextElem.innerText = "Scanning Reddit based on your selected period...";

        await fetchRedditChallenges();
        generateChallenge();
    };

    window.generateChallenge = function () {
        currentChallengeIndex = getNextChallengeIndex();

        if (currentChallengeIndex === -1) {
            currentChallenge = {
                text: "You have skipped or exhausted all gathered challenges.",
                why: "Consider trying a new discover search or checking your accepted list.",
                subreddit: "System",
                link: "#"
            };
        } else {
            currentChallenge = generatedChallenges[currentChallengeIndex];
        }

        updateDiscoverUI();
    };

    window.acceptChallenge = function () {
        const newAccepted = {
            id: currentChallenge.id || generateId(),
            text: currentChallenge.text,
            why: currentChallenge.why,
            subreddit: currentChallenge.subreddit || "Unknown",
            link: currentChallenge.link || "#",
            upvotes: currentChallenge.upvotes,
            comments: currentChallenge.comments,
            ratio: currentChallenge.ratio,
            date: currentChallenge.date,
            notes: "",
            status: "Accepted", // Default status
            acceptedAt: new Date().toISOString()
        };

        acceptedChallenges.push(newAccepted);
        seenCount++;

        saveData();
        updateBadge();
        renderAcceptedList(); // Pre-render in background

        // Show a brief animation or alert, then generate next
        generateChallenge();
    };

    window.rejectChallenge = function () {
        if (currentChallenge && currentChallenge.text !== "You have skipped or exhausted all gathered challenges.") {
            // Use unique ID if available, otherwise fallback to the exact text to track
            const skipIdentifier = currentChallenge.id || currentChallenge.text;
            if (!skippedChallenges.includes(skipIdentifier)) {
                skippedChallenges.push(skipIdentifier);
                localStorage.setItem("skippedChallenges", JSON.stringify(skippedChallenges));
            }
        }

        seenCount++;
        saveData();
        seenCountElem.innerText = seenCount;
        generateChallenge();
    };

    // Tab Switching
    window.switchTab = function (tabId) {
        // Update buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.currentTarget.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId + 'Tab').classList.add('active');

        if (tabId === 'accepted') {
            renderAcceptedList();
        }
    };

    // Render accepted challenges as dashboard
    window.renderAcceptedList = function () {
        const dashboard = document.getElementById('dashboardContainer');

        if (acceptedChallenges.length === 0) {
            dashboard.innerHTML = `<div class="empty-state">No challenges yet. Head to Discover!</div>`;
            return;
        }

        const statuses = ["Accepted", "Started", "Completed", "Archived", "Save for Later"];
        dashboard.innerHTML = '';

        // Group challenges by status
        const grouped = {};
        statuses.forEach(s => grouped[s] = []);

        acceptedChallenges.forEach(ch => {
            const stat = ch.status || "Accepted";
            if (grouped[stat]) grouped[stat].push(ch);
            else grouped["Accepted"].push(ch);
        });

        // Build accordions
        statuses.forEach(status => {
            const queue = grouped[status];
            if (queue.length === 0) return; // Hide empty sections

            const details = document.createElement('details');
            details.className = 'dashboard-section';
            details.open = (status === "Accepted" || status === "Started"); // Auto-open main ones

            details.innerHTML = `
                <summary class="dashboard-summary">
                    ${status} <span class="badge" style="margin-left: 10px">${queue.length}</span>
                </summary>
                <div class="cards-grid">
                    ${queue.reverse().map(ch => buildCardHTML(ch)).join('')}
                </div>
            `;
            dashboard.appendChild(details);
        });
    };

    function buildCardHTML(ch) {
        return `
            <div class="dashboard-card">
                <h3>${ch.text}</h3>
                
                <details class="dashboard-card-details">
                    <summary>Show Details</summary>
                    <div class="why">${ch.why}</div>
                    <div class="meta-info" style="margin-top: 15px; margin-bottom: 15px;">
                        <div class="meta-item">
                            <span class="meta-label">Subreddit:</span>
                            <span class="meta-value">${ch.subreddit}</span>
                        </div>
                        ${ch.upvotes !== undefined ? `
                        <div class="meta-item">
                            <span class="meta-label">Engagement:</span>
                            <span class="meta-value" style="font-size:0.85rem">${ch.upvotes}↑ | ${ch.comments}💬 | ${ch.ratio}%</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Published:</span>
                            <span class="meta-value">${ch.date}</span>
                        </div>
                        ` : ''}
                        ${ch.link !== "#" ? `
                        <div class="meta-item" style="border-bottom:none; padding-bottom:0;">
                            <span class="meta-label">Link:</span>
                            <a href="${ch.link}" target="_blank" class="meta-link">View Source</a>
                        </div>
                        ` : ''}
                    </div>
                </details>

                <textarea 
                    class="notes-area" 
                    id="notes-${ch.id}" 
                    placeholder="Add notes..."
                >${ch.notes || ''}</textarea>
                
                <div class="card-footer">
                    <select class="status-select" onchange="changeStatus('${ch.id}', this.value)">
                        <option value="Accepted" ${ch.status === 'Accepted' || !ch.status ? 'selected' : ''}>Accepted</option>
                        <option value="Started" ${ch.status === 'Started' ? 'selected' : ''}>Started</option>
                        <option value="Completed" ${ch.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Save for Later" ${ch.status === 'Save for Later' ? 'selected' : ''}>Save for Later</option>
                        <option value="Archived" ${ch.status === 'Archived' ? 'selected' : ''}>Archived</option>
                    </select>
                    <button class="btn-save" onclick="saveNote('${ch.id}')">Save</button>
                </div>
            </div>
        `;
    }

    window.changeStatus = function (id, newStatus) {
        const challenge = acceptedChallenges.find(c => c.id === id);
        if (challenge) {
            challenge.status = newStatus;
            saveData();
            updateBadge();
            renderAcceptedList();
        }
    };

    window.saveNote = function (id) {
        const notesArea = document.getElementById(`notes-${id}`);
        const challenge = acceptedChallenges.find(c => c.id === id);

        if (challenge) {
            challenge.notes = notesArea.value;
            saveData();

            // Visual feedback
            const btn = event.currentTarget;
            const originalText = btn.innerText;
            btn.innerText = "Saved!";
            btn.style.background = "var(--primary-dark)";

            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = "";
            }, 2000);
        }
    };

    // Deprecated for the new changeStatus logic, kept for fallback mapping if needed
    window.completeAcceptedChallenge = function (id) {
        changeStatus(id, 'Completed');
    };

    function saveData() {
        localStorage.setItem("acceptedChallenges", JSON.stringify(acceptedChallenges));
        localStorage.setItem("seenCount", seenCount.toString());
    }

    // Initialize first challenge
    await fetchRedditChallenges();
    generateChallenge();

    function buildChallengeFromPost(post, subreddit, isFallback = false) {
        return {
            id: post.id || generateId(),
            text: post.title,
            why: isFallback
                ? `Top discussion in r/${subreddit}. Look for implicit struggles or interests here.`
                : `A recurring friction point in r/${subreddit}. Building a solution or system for this creates direct value.`,
            subreddit: `r/${subreddit}`,
            link: `https://www.reddit.com${post.permalink}`,
            upvotes: post.ups || 0,
            comments: post.num_comments || 0,
            ratio: post.upvote_ratio ? Math.round(post.upvote_ratio * 100) : 0,
            date: post.created_utc ? new Date(post.created_utc * 1000).toLocaleDateString() : 'Unknown'
        };
    }

});