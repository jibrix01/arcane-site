import { supabase } from "./supabase_init.js";

export const INITIAL_SCORE = 10;

// Each round is open for 10 minutes from the moment its games are created.
const round_mins = 15;
const round_secs = 0;
export const ROUND_DURATION_MS = (round_mins * 60 + round_secs) * 1000;

// Points when both houses answer before the deadline.
export const PAYOFF_MATRIX = {
  split: { split: 3, steal: 0 },
  steal: { split: 5, steal: 1 },
};

// Points when only one house answers before the deadline.
const MISSED_RESPONDER_POINTS = 5;
const MISSED_NO_RESPONSE_POINTS = -2;

export function isTeam1(game, team) {
  return game.team1 === team;
}

export function myAndTheirChoice(game, team) {
  return isTeam1(game, team)
    ? { mine: game.team1_choice, theirs: game.team2_choice }
    : { mine: game.team2_choice, theirs: game.team1_choice };
}

export function getOpponent(game, team) {
  return isTeam1(game, team) ? game.team2 : game.team1;
}

export function getDeadline(game) {
  return new Date(game.created_at).getTime() + ROUND_DURATION_MS;
}

// Points one team earns from one game, based on its final status:
//   completed  -> both answered in time, scored via PAYOFF_MATRIX
//   missed     -> exactly one side answered; they get +5, the silent side gets -2
//   unanswered -> neither side answered, nobody scores
//   ongoing    -> round still open, no points yet
export function pointsForTeamInGame(game, team) {
  if (game.team1 !== team && game.team2 !== team) return 0;
  const { mine, theirs } = myAndTheirChoice(game, team);

  switch (game.status) {
    case "completed":
      if (!mine || !theirs) return 0; // safety net, shouldn't happen
      return PAYOFF_MATRIX[mine][theirs];
    case "missed":
      return mine ? MISSED_RESPONDER_POINTS : MISSED_NO_RESPONSE_POINTS;
    case "unanswered":
    case "ongoing":
    default:
      return 0;
  }
}

export function scoreForTeam(allGames, team) {
  return (
    INITIAL_SCORE +
    allGames.reduce((sum, g) => sum + pointsForTeamInGame(g, team), 0)
  );
}

// Flips any round whose 10-minute window has passed from "ongoing" into
// its real final status, based on who (if anyone) submitted a choice.
// Safe to call from any client (mod or player, whoever's clock notices
// first) — the .eq("status","ongoing") guard means only the first write
// actually changes anything; everyone else's write just matches 0 rows.
export async function finalizeExpiredGames(games) {
  const now = Date.now();
  const expired = games.filter(
    (g) => g.status === "ongoing" && getDeadline(g) <= now,
  );

  for (const g of expired) {
    const bothAnswered = !!g.team1_choice && !!g.team2_choice;
    const noneAnswered = !g.team1_choice && !g.team2_choice;
    const newStatus = bothAnswered
      ? "completed"
      : noneAnswered
        ? "unanswered"
        : "missed";

    const { error } = await supabase
      .from("games")
      .update({ status: newStatus })
      .eq("game_id", g.game_id)
      .eq("status", "ongoing");

    if (error) {
      console.error("Failed to finalize expired game:", g.game_id, error);
    }
  }
}

export function formatCountdown(ms) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
