import type { GameState, GameResult, PlayerId } from "./types";

export function computeResult(state: GameState): GameResult {
  const winner = state.winner ?? "hunter";
  const escapedPlayers = Object.values(state.players)
    .filter((p) => p.status === "escaped")
    .map((p) => p.id);

  // MVP: most repairs + rescues + heals
  let mvpId: PlayerId | null = null;
  let mvpScore = -1;
  for (const p of Object.values(state.players)) {
    const score =
      p.stats.repairsContributed * 3 +
      p.stats.rescuesPerformed * 5 +
      p.stats.healsPerformed * 4 +
      p.stats.distracionsPerformed * 2;
    if (score > mvpScore) {
      mvpScore = score;
      mvpId = p.id;
    }
  }

  // Most Reckless: most times captured + most noise made
  let recklessId: PlayerId | null = null;
  let recklessScore = -1;
  for (const p of Object.values(state.players)) {
    const score = p.stats.timesCapture * 5 + p.stats.noiseMade;
    if (score > recklessScore) {
      recklessScore = score;
      recklessId = p.id;
    }
  }

  // Most Helpful: rescues + heals
  let helpfulId: PlayerId | null = null;
  let helpfulScore = -1;
  for (const p of Object.values(state.players)) {
    const score = p.stats.rescuesPerformed * 5 + p.stats.healsPerformed * 4;
    if (score > helpfulScore) {
      helpfulScore = score;
      helpfulId = p.id;
    }
  }

  const hunterNote = _hunterNote(state, winner);

  return {
    winner,
    rounds: state.round,
    mvpId,
    mostRecklessId: recklessId,
    mostHelpfulId: helpfulId,
    hunterNote,
    escapedPlayers,
  };
}

function _hunterNote(state: GameState, winner: "survivors" | "hunter"): string {
  if (winner === "hunter") {
    if (state.eliminations >= 3) return "The manor is mine. None shall leave.";
    return "They thought they could hide. They were wrong.";
  }
  const escaped = Object.values(state.players).filter((p) => p.status === "escaped").length;
  if (escaped === 4) return "Impossible. They all escaped. This will not happen again.";
  if (escaped >= 2) return "Some fled. I'll find the rest.";
  return "One survivor… slipped through. Lucky.";
}
