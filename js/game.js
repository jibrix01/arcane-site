import { supabase } from "./supabase_init.js";

const gameArea = document.getElementById("game-area");

const INITIAL_SCORE = 10;

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

// Works for ANY team (mine or the opponent's) against the full games list.
function scoreForTeam(allGames, team) {
  const completed = allGames.filter(
    (g) => g.status === "completed" && (g.team1 === team || g.team2 === team),
  );
  return INITIAL_SCORE + totalScore(completed, team);
}

function getOpponent(game, myTeam) {
  return isTeam1(game, myTeam) ? game.team2 : game.team1;
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---------- card markup ----------
function createCard(
  team,
  {
    locked = false,
    waiting = false,
    score = null,
    myChoice = null,
    theirChoice = null,
  } = {},
) {
  const revealChoices = myChoice !== null && theirChoice !== null;

  let bodyText;
  if (revealChoices) {
    bodyText = `You chose <strong>${capitalize(myChoice)}</strong>`;
  } else if (waiting) {
    bodyText = "Waiting for your opponent's move...";
  } else {
    bodyText = team.description;
  }

  return `
<article class="game-card">
  <span class="game-card__num">${team.number}</span>
  <span class="game-card__arcana">${team.arcana}</span>
  <div class="game-card__icon">
    <img src="${team.icon}" alt="${team.arcana}" />
  </div>
  <h2>${team.name}</h2>
  <span class="game-card__sub">${team.subtitle}</span>
  ${score !== null ? `<p class="game-card__score">Score: ${score}</p>` : ""}
  <p>${bodyText}</p>
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

function createRevealedEnemyCard(
  team,
  {
    score = null,
    alreadyChose = false,
    revealChoices = false,
    theirChoice = null,
  } = {},
) {
  let statusLine;
  if (revealChoices) {
    statusLine = `Chose <strong>${capitalize(theirChoice)}</strong>`;
  } else if (alreadyChose) {
    statusLine = "Their move is locked in.";
  } else {
    statusLine = "Deciding...";
  }

  return `
<article class="game-card enemy-card">
  <span class="game-card__num">${team.number}</span>
  <span class="game-card__arcana">${team.arcana}</span>
  <div class="game-card__icon">
    <img src="${team.icon}" alt="${team.arcana}" />
  </div>
  <h2>${team.name}</h2>
  <span class="game-card__sub">${team.subtitle}</span>
  ${score !== null ? `<p class="game-card__score">Score: ${score}</p>` : ""}
  <p>${statusLine}</p>
</article>`;
}

// ---------- data fetching ----------
// Fetches the FULL games table so we can compute any team's score
// (mine or the opponent's), not just games I'm part of.
async function fetchAllGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
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

  const allGames = await fetchAllGames();
  const myGames = allGames.filter(
    (g) => g.team1 === teamName || g.team2 === teamName,
  );
  const myScore = scoreForTeam(allGames, teamName);

  // Most recent game involving me — could be "ongoing" or the just-finished
  // "completed" one. This is what keeps the result visible after both
  // players have chosen, instead of vanishing the instant status flips.
  const currentGame = myGames[0] || null;

  if (!subscribed) {
    subscribeToGameUpdates(teamName);
    subscribed = true;
  }

  let playerCardHtml;
  let enemyCardHtml;

  if (currentGame) {
    const { mine, theirs } = myAndTheirChoice(currentGame, teamName);
    const opponentKey = getOpponent(currentGame, teamName);
    const opponentHouse = houses[opponentKey];
    const opponentScore = scoreForTeam(allGames, opponentKey);

    const isCompleted = currentGame.status === "completed";
    const bothIn = !!mine && !!theirs;
    const revealChoices = isCompleted || bothIn;

    playerCardHtml = createCard(team, {
      locked: !!mine || isCompleted,
      waiting: !!mine && !revealChoices,
      score: myScore,
      myChoice: revealChoices ? mine : null,
      theirChoice: revealChoices ? theirs : null,
    });

    enemyCardHtml = opponentHouse
      ? createRevealedEnemyCard(opponentHouse, {
          score: opponentScore,
          alreadyChose: !!theirs,
          revealChoices,
          theirChoice: revealChoices ? theirs : null,
        })
      : createEnemyCard();
  } else {
    playerCardHtml = createCard(team, { locked: true, score: myScore });
    enemyCardHtml = createEnemyCard();
  }

  gameArea.innerHTML = `
    <div class="player-side">${playerCardHtml}</div>
    <div class="enemy-side">${enemyCardHtml}</div>
  `;

  if (currentGame && currentGame.status === "ongoing") {
    const { mine } = myAndTheirChoice(currentGame, teamName);
    if (!mine) {
      document.querySelector(".split-btn").onclick = (e) =>
        handleChoiceClick(e.currentTarget, currentGame, teamName, "split");
      document.querySelector(".steal-btn").onclick = (e) =>
        handleChoiceClick(e.currentTarget, currentGame, teamName, "steal");
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
    buttons.forEach((b) => {
      b.disabled = false;
      b.textContent = originalTexts.get(b);
    });
  }
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

// Listens for ANY change (insert, update, delete) on rows where I'm
// team1 or team2 — "*" instead of just "UPDATE" is what makes new
// rounds (which are INSERTs from the mod) show up without a refresh.
function subscribeToGameUpdates(myTeam) {
  supabase
    .channel(`game-updates-${myTeam}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "games",
        filter: `team1=eq.${myTeam}`,
      },
      (payload) => {
        console.log("REALTIME EVENT (team1)", payload);
        loadGame();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "games",
        filter: `team2=eq.${myTeam}`,
      },
      (payload) => {
        console.log("REALTIME EVENT (team2)", payload);
        loadGame();
      },
    )
    .subscribe();
}

loadGame();
