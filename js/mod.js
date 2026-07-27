import { supabase } from "./supabase_init.js";

const HOUSE_LABELS = {
  planeswalkers: "Planeswalkers",
  trailblazers: "Trailblazers",
  conquerers: "Conquerers",
  heartweavers: "Heartweavers",
  pathmakers: "Pathmakers",
  truthseekers: "Truthseekers",
  descenders: "Descenders",
  lightbearers: "Lightbearers",
};
const HOUSE_KEYS = Object.keys(HOUSE_LABELS);
const ROUND_SIZE = 4;
const INITIAL_SCORE = 10;

// Must match the payoff matrix in game.js exactly, or scores will disagree
// between the player view and the mod leaderboard.
const PAYOFF_MATRIX = {
  split: { split: 3, steal: 0 },
  steal: { split: 5, steal: 1 },
};

// Two dedicated panels inside the .mod-dashboard grid (see index HTML),
// rather than one container that gets clobbered on every re-render.
const roundArea = document.getElementById("round-panel");
const leaderboardArea = document.getElementById("leaderboard-panel");

async function requireMod() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return false;
  }

  const teamName = user.email.split("@")[0].toLowerCase();

  if (teamName !== "mod") {
    document.getElementById("mod-dashboard")?.remove();
    return false;
  }

  document.getElementById("mod-dashboard").hidden = false;

  return true;
}

function buildOptionsHtml() {
  return HOUSE_KEYS.map(
    (key) => `<option value="${key}">${HOUSE_LABELS[key]}</option>`,
  ).join("");
}

function renderRoundForm() {
  const rows = Array.from({ length: ROUND_SIZE })
    .map(
      (_, i) => `
<tr data-row="${i}">
    <td>
        <select class="team1-select">
            <option value="">Choose House...</option>
            ${buildOptionsHtml()}
        </select>
    </td>
    <td class="vs-cell">VS</td>
    <td>
        <select class="team2-select">
            <option value="">Choose House...</option>
            ${buildOptionsHtml()}
        </select>
    </td>
</tr>`,
    )
    .join("");

  roundArea.innerHTML = `
<div class="mod-title">
    <h2>Create Round</h2>
    <p>Select four unique matchups.</p>
</div>
<table class="round-table matchup-table">
    <thead><tr><th>Team 1</th><th></th><th>Team 2</th></tr></thead>
    <tbody>${rows}</tbody>
</table>
<p id="round-error" class="login-error" hidden></p>
<div class="round-actions">
    <button type="button" id="submit-round-btn" class="rune-button">
        ✦ Start New Round
    </button>
</div>
`;

  document
    .getElementById("submit-round-btn")
    .addEventListener("click", handleSubmitRound);
}

function showRoundError(message) {
  const el = document.getElementById("round-error");
  el.textContent = message;
  el.hidden = false;
}

function clearRoundError() {
  const el = document.getElementById("round-error");
  el.hidden = true;
  el.textContent = "";
}

function collectMatchupsFromForm() {
  return Array.from(document.querySelectorAll(".matchup-table tbody tr")).map(
    (row) => ({
      team1: row.querySelector(".team1-select").value,
      team2: row.querySelector(".team2-select").value,
    }),
  );
}

function validateMatchups(matchups) {
  const seenTeams = new Set();
  const seenPairs = new Set();

  for (const { team1, team2 } of matchups) {
    if (!team1 || !team2) return "Every row needs both teams selected.";
    if (team1 === team2)
      return `${HOUSE_LABELS[team1]} can't be matched against itself.`;
    if (seenTeams.has(team1) || seenTeams.has(team2))
      return `${HOUSE_LABELS[team1]} or ${HOUSE_LABELS[team2]} is already booked in another matchup this round.`;
    seenTeams.add(team1);
    seenTeams.add(team2);

    const pairKey = [team1, team2].sort().join("-");
    if (seenPairs.has(pairKey))
      return `${HOUSE_LABELS[team1]} vs ${HOUSE_LABELS[team2]} is listed more than once.`;
    seenPairs.add(pairKey);
  }
  return null;
}

async function fetchAllGames() {
  const { data, error } = await supabase.from("games").select("*");
  if (error) {
    console.error("Failed to fetch games:", error);
    return [];
  }
  return data;
}

function scoreForTeam(allGames, team) {
  return (
    INITIAL_SCORE +
    allGames.reduce((sum, g) => {
      if (g.status !== "completed") return sum;
      if (g.team1 !== team && g.team2 !== team) return sum;
      const mine = g.team1 === team ? g.team1_choice : g.team2_choice;
      const theirs = g.team1 === team ? g.team2_choice : g.team1_choice;
      if (!mine || !theirs) return sum;
      return sum + PAYOFF_MATRIX[mine][theirs];
    }, 0)
  );
}

async function checkNoHistoricalRepeats(matchups) {
  const allGames = await fetchAllGames();
  const playedPairs = new Set(
    allGames.map((g) => [g.team1, g.team2].sort().join("-")),
  );

  for (const { team1, team2 } of matchups) {
    const pairKey = [team1, team2].sort().join("-");
    if (playedPairs.has(pairKey)) {
      return `${HOUSE_LABELS[team1]} vs ${HOUSE_LABELS[team2]} battled already`;
    }
  }
  return null;
}

async function allGamesCompleted() {
  const { data, error } = await supabase
    .from("games")
    .select("game_id")
    .neq("status", "completed")
    .limit(1);

  if (error) {
    console.error("Failed to check game statuses:", error);
    throw error;
  }
  return data.length === 0;
}

async function handleSubmitRound() {
  clearRoundError();

  const submitBtn = document.getElementById("submit-round-btn");
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Submitting...";

  try {
    const matchups = collectMatchupsFromForm();

    const validationError = validateMatchups(matchups);
    if (validationError) {
      showRoundError(validationError);
      return;
    }

    const historyError = await checkNoHistoricalRepeats(matchups);
    if (historyError) {
      showRoundError(historyError);
      return;
    }

    const clear = await allGamesCompleted();
    if (!clear) {
      showRoundError(
        "Can't start a new round — there are still ongoing games.",
      );
      return;
    }

    const { error: rpcError } = await supabase.rpc("create_new_round", {
      matchups,
    });

    if (rpcError) {
      showRoundError(rpcError.message);
      return;
    }

    renderRoundForm(); // resets the form only; leaderboard panel is independent now
    await renderLeaderboard();
  } catch (err) {
    console.error(err);
    showRoundError("Something went wrong. Check the console for details.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function renderLeaderboard() {
  if (!leaderboardArea) return;

  const allGames = await fetchAllGames();
  const rows = HOUSE_KEYS.map((key) => ({
    key,
    score: scoreForTeam(allGames, key),
  })).sort((a, b) => b.score - a.score);

  leaderboardArea.innerHTML = `
<div class="mod-title">
    <h2>Leaderboard</h2>
    <p>Current standings</p>
</div>
<table class="round-table leaderboard-table">
    <thead><tr><th></th><th>House</th><th>Score</th></tr></thead>
    <tbody>
        ${rows
          .map(
            (r, i) => `
        <tr class="${i === 0 ? "is-leader" : ""}">
            <td class="rank">${i + 1}</td>
            <td>${HOUSE_LABELS[r.key]}</td>
            <td class="score">${r.score}</td>
        </tr>`,
          )
          .join("")}re
    </tbody>
</table>
`;
}

function subscribeToLeaderboardUpdates() {
  supabase
    .channel("mod-leaderboard")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games" },
      () => renderLeaderboard(),
    )
    .subscribe();
}

(async function init() {
  if (await requireMod()) {
    renderRoundForm();
    await renderLeaderboard();
    subscribeToLeaderboardUpdates();
  }
})();
