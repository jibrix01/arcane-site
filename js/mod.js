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
const ROUND_SIZE = 4; // 2 cols x 4 rows

const roundArea = document.getElementById("round-setup");

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
    // Not the mod — leave #round-setup empty, don't reveal that this exists
    return false;
  }
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

    <td class="vs-cell">
        VS
    </td>

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
<div class="tracker-panel round-panel">

    <div class="page-head">
        <div class="eyebrow">Moderator Console</div>
        <h2>Start a New Round</h2>
        <p>
            Pair each House exactly once. Previous matchups cannot be repeated.
        </p>
    </div>

    <table class="round-table">
        <thead>
            <tr>
                <th>Team 1</th>
                <th></th>
                <th>Team 2</th>
            </tr>
        </thead>

        <tbody>
            ${rows}
        </tbody>
    </table>

    <p id="round-error" class="login-error" hidden></p>

    <div class="round-actions">
        <button
            type="button"
            id="submit-round-btn"
            class="rune-button"
        >
            ✦ Start New Round
        </button>
    </div>

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
  return Array.from(document.querySelectorAll(".round-table tbody tr")).map(
    (row) => ({
      team1: row.querySelector(".team1-select").value,
      team2: row.querySelector(".team2-select").value,
    }),
  );
}

// Client-side pre-check for instant feedback — mirrors the same rules
// enforced authoritatively inside create_new_round() in Postgres.
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

async function checkNoHistoricalRepeats(matchups) {
  const { data: allGames, error } = await supabase
    .from("games")
    .select("team1, team2");

  if (error) {
    console.error("Failed to check match history:", error);
    return null; // let the server-side check be the final word
  }

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

    // Server-side function re-checks everything and inserts atomically —
    // this is the actual ACID guarantee, the checks above are just UX.
    const { error: rpcError } = await supabase.rpc("create_new_round", {
      matchups,
    });

    if (rpcError) {
      showRoundError(rpcError.message);
      return;
    }

    renderRoundForm(); // reset for the next round
  } catch (err) {
    console.error(err);
    showRoundError("Something went wrong. Check the console for details.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

(async function init() {
  if (await requireMod()) {
    renderRoundForm();
  }
})();
