import { supabase } from "./supabase_init.js";
import {
  scoreForTeam,
  finalizeExpiredGames,
  getDeadline,
  formatCountdown,
} from "./scoring.js";

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

// Two dedicated panels inside the .mod-dashboard grid (see index HTML),
// rather than one container that gets clobbered on every re-render.
const roundArea = document.getElementById("round-panel");
const leaderboardArea = document.getElementById("leaderboard-panel");

let roundCountdownId = null;

function clearRoundCountdown() {
  if (roundCountdownId) {
    clearInterval(roundCountdownId);
    roundCountdownId = null;
  }
}

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
  return true;
}

function buildOptionsHtml() {
  return HOUSE_KEYS.map(
    (key) => `<option value="${key}">${HOUSE_LABELS[key]}</option>`,
  ).join("");
}

// Decides which of the two round-panel views to show: the create-round
// form (no round in progress) or the live countdown view (round ongoing).
async function renderRoundPanel() {
  clearRoundCountdown();

  const allGames = await fetchAllGames();
  await finalizeExpiredGames(allGames);

  // Re-fetch in case finalizeExpiredGames just changed something above,
  // so the view we render reflects the true current state.
  const freshGames = await fetchAllGames();
  const ongoing = freshGames.filter((g) => g.status === "ongoing");

  if (ongoing.length > 0) {
    renderActiveRoundView(ongoing);
  } else {
    renderCreateRoundForm();
  }
}

function renderCreateRoundForm() {
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

// Shown instead of the form while games are still "ongoing". Displays a
// shared round countdown plus each matchup's answered-so-far status
// (without revealing the actual choices — that stays secret until the
// round finishes, same as the player view).
function renderActiveRoundView(ongoingGames) {
  const roundDeadline = Math.min(...ongoingGames.map(getDeadline));

  const rows = ongoingGames
    .map((g) => {
      const answered = [g.team1_choice, g.team2_choice].filter(Boolean).length;
      return `
<tr>
    <td>${HOUSE_LABELS[g.team1] ?? g.team1}</td>
    <td class="vs-cell">VS</td>
    <td>${HOUSE_LABELS[g.team2] ?? g.team2}</td>
    <td class="answer-status">${answered}/2 answered</td>
</tr>`;
    })
    .join("");

  roundArea.innerHTML = `
<div class="mod-title">
    <h2>Round In Progress</h2>
    <p>Waiting for houses to submit their choices.</p>
</div>
<div class="round-timer-bar">
    <span>Time left:</span> <span id="round-timer">--:--</span>
</div>
<table class="round-table active-round-table">
    <thead><tr><th>Team 1</th><th></th><th>Team 2</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
</table>
`;

  startRoundCountdown(roundDeadline, ongoingGames);
}

function startRoundCountdown(deadline, ongoingGames) {
  const timerEl = document.getElementById("round-timer");
  if (!timerEl) return;

  const tick = async () => {
    const remaining = deadline - Date.now();
    timerEl.textContent = formatCountdown(remaining);

    if (remaining <= 0) {
      clearRoundCountdown();
      await finalizeExpiredGames(ongoingGames);
      await renderRoundPanel();
      await renderLeaderboard();
    }
  };

  tick();
  roundCountdownId = setInterval(tick, 1000);
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

// "Completed" is no longer the only terminal state (there's also
// "missed" and "unanswered" once a round's timer runs out), so this
// checks for the one status that actually blocks a new round: "ongoing".
async function noOngoingGames() {
  const { data, error } = await supabase
    .from("games")
    .select("game_id")
    .eq("status", "ongoing")
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

    const clear = await noOngoingGames();
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

    await renderRoundPanel(); // will now show the active-round countdown view
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
          .join("")}
    </tbody>
</table>
`;
}

function subscribeToGameChanges() {
  supabase
    .channel("mod-dashboard")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games" },
      () => {
        renderRoundPanel();
        renderLeaderboard();
      },
    )
    .subscribe();
}

(async function init() {
  if (await requireMod()) {
    await renderRoundPanel();
    await renderLeaderboard();
    subscribeToGameChanges();
  }
})();
