import { supabase } from "./supabase_init.js";

const gameArea = document.getElementById("game-area");

const houses = {
  planeswalkers: {
    name: "Planeswalkers",
    arcana: "The Magician",
    number: "I",
    subtitle: "Arcana of Upheaval",
    icon: "/assets/icons/magician.png",
    description:
      "Every spell begins with intention. Let your ingenuity weave triumph.",
  },
  trailblazers: {
    name: "Trailblazers",
    arcana: "The Star",
    number: "II",
    subtitle: "Arcana of Wonder",
    icon: "/assets/icons/star.png",
    description: "Brimming with potential, let optimism guide every step.",
  },
  conquerers: {
    name: "Conquerers",
    arcana: "The Emperor",
    number: "III",
    subtitle: "Arcana of Command",
    icon: "/assets/icons/emperor.png",
    description: "The throne is not inherited — it is earned.",
  },
  heartweavers: {
    name: "Heartweavers",
    arcana: "The Lovers",
    number: "IV",
    subtitle: "Arcana of Bonds",
    icon: "/assets/icons/lovers.png",
    description: "The stars have woven your paths together.",
  },
  pathmakers: {
    name: "Pathmakers",
    arcana: "The Chariot",
    number: "V",
    subtitle: "Arcana of Direction",
    icon: "/assets/icons/chariot.png",
    description: "Triumph favors those who never cease moving.",
  },
  truthseekers: {
    name: "Truthseekers",
    arcana: "The Hermit",
    number: "VI",
    subtitle: "Arcana of Clarity",
    icon: "/assets/icons/hermit.png",
    description: "Knowledge becomes your greatest strength.",
  },
  descenders: {
    name: "Descenders",
    arcana: "The Fool",
    number: "VII",
    subtitle: "Arcana of Daring",
    icon: "/assets/icons/fools.png",
    description: "Every great tale begins with a leap of faith.",
  },
  lightbearers: {
    name: "Lightbearers",
    arcana: "The Sun",
    number: "VIII",
    subtitle: "Arcana of Warmth",
    icon: "/assets/icons/sun.png",
    description: "Burn brightly so you may illuminate your path.",
  },
};

// ---------- payoff / scoring ----------
const PAYOFF_MATRIX = {
  split: { split: 3, steal: 0 },
  steal: { split: 5, steal: 1 },
};

function isTeam1(game, myTeam) {
  return game.team1 === myTeam;
}

function myAndTheirChoice(game, myTeam) {
  return isTeam1(game, myTeam)
    ? { mine: game.team1_choice, theirs: game.team2_choice }
    : { mine: game.team2_choice, theirs: game.team1_choice };
}

function totalScore(completedGames, myTeam) {
  return completedGames.reduce((sum, g) => {
    const { mine, theirs } = myAndTheirChoice(g, myTeam);
    if (!mine || !theirs) return sum;
    return sum + PAYOFF_MATRIX[mine][theirs];
  }, 0);
}

function getOpponent(game, myTeam) {
  return isTeam1(game, myTeam) ? game.team2 : game.team1;
}

// ---------- card markup ----------
function createCard(team, { locked = false, waiting = false } = {}) {
  return `
<article class="game-card">
  <span class="game-card__num">${team.number}</span>
  <span class="game-card__arcana">${team.arcana}</span>
  <div class="game-card__icon">
    <img src="${team.icon}" alt="${team.arcana}" />
  </div>
  <h2>${team.name}</h2>
  <span class="game-card__sub">${team.subtitle}</span>
  <p>${waiting ? "Waiting for your opponent's move..." : team.description}</p>
  <div class="game-actions" style="${locked ? "visibility:hidden" : ""}">
    <button class="split-btn" ${locked ? "disabled" : ""}>Split</button>
    <button class="steal-btn" ${locked ? "disabled" : ""}>Steal</button>
  </div>
</article>`;
}

function createEnemyCard() {
  return `
<article class="game-card enemy-card">
  <span class="game-card__arcana">Opponent</span>
  <div class="game-card__icon">✦</div>
  <h2>Hidden House</h2>
  <span class="game-card__sub">Awaiting Fate</span>
  <p>The Arcana has yet to reveal your opponent.</p>
</article>`;
}

function createRevealedEnemyCard(team, alreadyChose) {
  return `
<article class="game-card enemy-card">
  <span class="game-card__num">${team.number}</span>
  <span class="game-card__arcana">${team.arcana}</span>
  <div class="game-card__icon">
    <img src="${team.icon}" alt="${team.arcana}" />
  </div>
  <h2>${team.name}</h2>
  <span class="game-card__sub">${team.subtitle}</span>
  <p>${alreadyChose ? "Their move is locked in." : "Deciding..."}</p>
</article>`;
}

// ---------- data fetching ----------
async function fetchMyGames(myTeam) {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .or(`team1.eq.${myTeam},team2.eq.${myTeam}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch games:", error);
    return [];
  }
  return data;
}

// ---------- main render ----------
let teamName = null;
let subscribed = false;
let submissionInFlight = false;

async function loadGame() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const email = user.email;
  teamName = email.split("@")[0].toLowerCase();

  if (teamName === "mod") {
    gameArea.innerHTML = `<div class="game-card"><h2>Admin Access</h2><p>You have moderator privileges.</p></div>`;
    return;
  }

  const team = houses[teamName];
  if (!team) {
    gameArea.innerHTML = `<div class="game-card"><h2>Unknown House</h2><p>Your account is not assigned.</p></div>`;
    return;
  }

  const allGames = await fetchMyGames(teamName);
  const completedGames = allGames.filter((g) => g.status === "completed");
  const ongoingGame = allGames.find((g) => g.status === "ongoing") || null;
  const initialScore = 10;
  const score = initialScore + totalScore(completedGames, teamName);

  if (!subscribed) {
    subscribeToGameUpdates(teamName);
    subscribed = true;
  }

  let playerCardHtml;
  let enemyCardHtml;

  if (ongoingGame) {
    const { mine } = myAndTheirChoice(ongoingGame, teamName);
    const opponentKey = getOpponent(ongoingGame, teamName);
    const opponentHouse = houses[opponentKey];

    playerCardHtml = createCard(team, { locked: !!mine, waiting: !!mine });
    enemyCardHtml = opponentHouse
      ? createRevealedEnemyCard(opponentHouse, !!mine)
      : createEnemyCard();
  } else {
    playerCardHtml = createCard(team, { locked: true });
    enemyCardHtml = createEnemyCard();
  }

  gameArea.innerHTML = `
    <p class="score-display">Score: ${score}</p>
    <div class="player-side">${playerCardHtml}</div>
    <div class="enemy-side">${enemyCardHtml}</div>
  `;

  if (ongoingGame) {
    const { mine } = myAndTheirChoice(ongoingGame, teamName);
    if (!mine) {
      document.querySelector(".split-btn").onclick = (e) =>
        handleChoiceClick(e.currentTarget, ongoingGame, teamName, "split");
      document.querySelector(".steal-btn").onclick = (e) =>
        handleChoiceClick(e.currentTarget, ongoingGame, teamName, "steal");
    }
  }
}

async function handleChoiceClick(button, game, myTeam, choice) {
  if (submissionInFlight) return;

  const actionsRow = button.closest(".game-actions");
  const buttons = actionsRow.querySelectorAll("button");
  const originalTexts = new Map();

  buttons.forEach((b) => {
    originalTexts.set(b, b.textContent);
    b.disabled = true;
  });
  button.textContent = "Submitting...";

  const ok = await submitChoice(game, myTeam, choice);

  if (!ok) {
    // Re-enable so the user can retry after a failed/network error
    buttons.forEach((b) => {
      b.disabled = false;
      b.textContent = originalTexts.get(b);
    });
  }
  // On success, loadGame() has already re-rendered the whole card
  // into its locked/waiting state, so no manual reset needed.
}

async function submitChoice(game, myTeam, choice) {
  if (submissionInFlight) return false;
  submissionInFlight = true;

  try {
    const column = isTeam1(game, myTeam) ? "team1_choice" : "team2_choice";

    const { data, error } = await supabase
      .from("games")
      .update({ [column]: choice })
      .eq("game_id", game.game_id)
      .eq("status", "ongoing")
      .select()
      .single();

    if (error) {
      console.error("Failed to submit choice:", error);
      return false;
    }

    if (data.team1_choice && data.team2_choice) {
      const { error: finalizeErr } = await supabase
        .from("games")
        .update({ status: "completed" })
        .eq("game_id", data.game_id)
        .eq("status", "ongoing");
      if (finalizeErr) console.error("Failed to finalize:", finalizeErr);
    }

    await loadGame();
    return true;
  } finally {
    submissionInFlight = false;
  }
}

function subscribeToGameUpdates(myTeam) {
  supabase
    .channel("game-updates")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `team1=eq.${myTeam}`,
      },
      () => loadGame(),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `team2=eq.${myTeam}`,
      },
      () => loadGame(),
    )
    .subscribe();
}

loadGame();
