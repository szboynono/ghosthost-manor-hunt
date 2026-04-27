/**
 * Headless simulation — runs N games with full autopilot,
 * prints statistics, and asserts basic sanity on the results.
 */
import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/game/initialState";
import {
  applyPlayerAction, applyHunterAction, resolveChaseChoice,
  updateFear, updateCaptureCountdowns, updateGates, resolveEscapes,
  advanceRound, checkWinCondition, setSeed, getAvailableActions,
  resolveTrapTriggers,
} from "../src/game/engine";
import { decideHunterAction } from "../src/game/hunterAI";
import { decideAutopilotAction } from "../src/game/autopilot";
import type { GameState, PlayerId, RoomId } from "../src/game/types";
import { ADJACENCY, GATE_ROOMS } from "../src/game/constants";

const MAX_ROUNDS = 60;
const SIM_GAMES = 200;

interface SimResult {
  winner: "survivors" | "hunter" | "timeout";
  rounds: number;
  machinesRepaired: number;
  eliminations: number;
  totalCaptures: number;
  actionCounts: Record<string, number>;
  firstCaptureRound: number | null;
  firstEliminationRound: number | null;
  hunterActionCounts: Record<string, number>;
  chaseOutcomes: { escaped: number; captured: number };
}

function nearestGate(state: GameState, from: RoomId): RoomId | null {
  const openGates = GATE_ROOMS.filter(g => state.rooms[g].isGateOpen);
  if (openGates.length === 0) return null;
  // BFS toward nearest open gate
  const queue: RoomId[] = [from];
  const visited = new Set<RoomId>([from]);
  const parent = new Map<RoomId, RoomId>();
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (openGates.includes(cur) && cur !== from) {
      let step = cur;
      while (parent.get(step) !== from) step = parent.get(step)!;
      return step;
    }
    for (const adj of ADJACENCY[cur]) {
      if (!visited.has(adj)) { visited.add(adj); parent.set(adj, cur); queue.push(adj); }
    }
  }
  return null;
}

function smartAutopilot(state: GameState, pid: PlayerId): ReturnType<typeof decideAutopilotAction> {
  const available = getAvailableActions(state, pid);

  // If gates are open → navigate toward nearest open gate to escape
  if (state.machinesRepaired >= 5) {
    const player = state.players[pid];
    const room = state.rooms[player.roomId];
    if (room.isGate && room.isGateOpen) return { type: "wait" }; // already here, escape will auto-trigger
    const gateStep = nearestGate(state, player.roomId);
    if (gateStep) {
      const move = available.find(a => a.type === "move" && a.targetRoomId === gateStep);
      if (move) return move;
    }
  }

  return decideAutopilotAction(state, pid);
}

function runGame(seed: number): SimResult {
  setSeed(seed);
  let state = createInitialState();

  const actionCounts: Record<string, number> = {};
  const hunterActionCounts: Record<string, number> = {};
  const chaseOutcomes = { escaped: 0, captured: 0 };
  let firstCaptureRound: number | null = null;
  let firstEliminationRound: number | null = null;
  const prevCaptures = { val: 0 };
  const prevElims = { val: 0 };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Apply all survivor actions
    for (const pid of (["p1", "p2", "p3", "p4"] as PlayerId[])) {
      const player = state.players[pid];
      if (player.status !== "active" && player.status !== "injured") continue;
      const action = smartAutopilot(state, pid);
      actionCounts[action.type] = (actionCounts[action.type] ?? 0) + 1;
      state = applyPlayerAction(state, pid, action);
    }

    // Resolve traps for survivors who moved this round
    state = resolveTrapTriggers(state);

    // Hunter action
    const ha = decideHunterAction(state);
    hunterActionCounts[ha.type] = (hunterActionCounts[ha.type] ?? 0) + 1;
    state = applyHunterAction(state, ha);

    // Auto-resolve chase
    if (state.phase === "chaseEncounter" && state.pendingChase) {
      const { playerId } = state.pendingChase;
      const p = state.players[playerId];
      // Pick best choice for current fear level
      const choice = p.fear < 50 ? "holdBreath" : "throwObject";
      state = resolveChaseChoice(state, playerId, choice);
      const newStatus = state.players[playerId].status;
      if (newStatus === "injured" || newStatus === "captured") chaseOutcomes.captured++;
      else chaseOutcomes.escaped++;
    }

    // Track first capture
    if (firstCaptureRound === null && state.totalCaptures > prevCaptures.val) {
      firstCaptureRound = round + 1;
    }
    prevCaptures.val = state.totalCaptures;

    // End-of-round
    state = updateFear(state);
    state = updateCaptureCountdowns(state);

    if (firstEliminationRound === null && state.eliminations > prevElims.val) {
      firstEliminationRound = round + 1;
    }
    prevElims.val = state.eliminations;

    state = updateGates(state);
    state = resolveEscapes(state);

    const winner = checkWinCondition(state);
    if (winner) {
      return {
        winner, rounds: round + 1,
        machinesRepaired: state.machinesRepaired,
        eliminations: state.eliminations,
        totalCaptures: state.totalCaptures,
        actionCounts, hunterActionCounts, chaseOutcomes,
        firstCaptureRound, firstEliminationRound,
      };
    }
    state = advanceRound(state);
  }

  return {
    winner: "timeout", rounds: MAX_ROUNDS,
    machinesRepaired: state.machinesRepaired,
    eliminations: state.eliminations,
    totalCaptures: state.totalCaptures,
    actionCounts, hunterActionCounts, chaseOutcomes,
    firstCaptureRound, firstEliminationRound,
  };
}

describe("simulation", () => {
  it(`runs ${SIM_GAMES} games and reports balance statistics`, () => {
    const results: SimResult[] = [];
    for (let i = 0; i < SIM_GAMES; i++) {
      results.push(runGame(i * 9973 + 1337));
    }

    const n = results.length;
    const sw = results.filter(r => r.winner === "survivors").length;
    const hw = results.filter(r => r.winner === "hunter").length;
    const to = results.filter(r => r.winner === "timeout").length;
    const decided = sw + hw;

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    const pct = (x: number) => ((x / n) * 100).toFixed(1) + "%";

    const allRounds = results.map(r => r.rounds);
    const swRounds = results.filter(r => r.winner === "survivors").map(r => r.rounds);
    const hwRounds = results.filter(r => r.winner === "hunter").map(r => r.rounds);
    const captureRounds = results.filter(r => r.firstCaptureRound !== null).map(r => r.firstCaptureRound!);
    const elimRounds = results.filter(r => r.firstEliminationRound !== null).map(r => r.firstEliminationRound!);

    // Action totals
    const totalActs: Record<string, number> = {};
    const totalHunterActs: Record<string, number> = {};
    const totalChase = { escaped: 0, captured: 0 };
    for (const r of results) {
      for (const [k, v] of Object.entries(r.actionCounts)) totalActs[k] = (totalActs[k] ?? 0) + v;
      for (const [k, v] of Object.entries(r.hunterActionCounts)) totalHunterActs[k] = (totalHunterActs[k] ?? 0) + v;
      totalChase.escaped += r.chaseOutcomes.escaped;
      totalChase.captured += r.chaseOutcomes.captured;
    }
    const sumActs = Object.values(totalActs).reduce((a, b) => a + b, 0);
    const sumHunter = Object.values(totalHunterActs).reduce((a, b) => a + b, 0);
    const sumChase = totalChase.escaped + totalChase.captured;

    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║  GHOSTHOST SIM RESULTS  (n=" + n + ")               ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log(`\n  Survivor wins : ${sw.toString().padStart(4)} / ${n}  (${pct(sw)})`);
    console.log(`  Hunter wins   : ${hw.toString().padStart(4)} / ${n}  (${pct(hw)})`);
    console.log(`  Timeouts      : ${to.toString().padStart(4)} / ${n}  (${pct(to)})`);

    console.log(`\n  Avg rounds (all)         : ${avg(allRounds).toFixed(1)}`);
    console.log(`  Avg rounds – surv win    : ${avg(swRounds).toFixed(1)}`);
    console.log(`  Avg rounds – hunter win  : ${avg(hwRounds).toFixed(1)}`);
    console.log(`  Avg first capture round  : ${avg(captureRounds).toFixed(1)}`);
    console.log(`  Avg first elim round     : ${avg(elimRounds).toFixed(1)}`);
    console.log(`  Avg machines repaired    : ${avg(results.map(r => r.machinesRepaired)).toFixed(2)}`);
    console.log(`  Avg total captures       : ${avg(results.map(r => r.totalCaptures)).toFixed(2)}`);
    console.log(`  Avg eliminations         : ${avg(results.map(r => r.eliminations)).toFixed(2)}`);

    console.log("\n  Survivor action distribution:");
    for (const [k, v] of Object.entries(totalActs).sort((a, b) => b[1] - a[1])) {
      const bar = "█".repeat(Math.round(v / sumActs * 40));
      console.log(`    ${k.padEnd(10)} ${bar.padEnd(40)} ${((v / sumActs) * 100).toFixed(1)}%`);
    }

    console.log("\n  Hunter action distribution:");
    for (const [k, v] of Object.entries(totalHunterActs).sort((a, b) => b[1] - a[1])) {
      const bar = "█".repeat(Math.round(v / sumHunter * 40));
      console.log(`    ${k.padEnd(10)} ${bar.padEnd(40)} ${((v / sumHunter) * 100).toFixed(1)}%`);
    }

    if (sumChase > 0) {
      console.log(`\n  Chase outcomes: ${totalChase.escaped} escaped (${((totalChase.escaped/sumChase)*100).toFixed(1)}%), ` +
        `${totalChase.captured} caught (${((totalChase.captured/sumChase)*100).toFixed(1)}%)`);
    }
    console.log("");

    // Basic sanity assertions
    expect(to).toBeLessThan(n * 0.05); // fewer than 5% timeouts
    expect(decided).toBeGreaterThan(0);
  });
});
