import type { GameState, HunterAction, PlayerId, RoomId } from "./types";
import { ADJACENCY, MACHINES_TO_WIN, GATE_ROOMS } from "./constants";
import { rng } from "./engine";

// ─── The Warden – heuristic AI Hunter ────────────────────────────────────────
// Priority: guard captured > chase injured/noisy > blockExit late-game > trap high-value > listen > trap fallback > patrol

export function decideHunterAction(state: GameState): HunterAction {
  const hunter = state.hunter;
  const adj = ADJACENCY[hunter.roomId];
  const reachable = (id: RoomId) => id === hunter.roomId || adj.includes(id);

  // 1. Guard a captured player in the current room — but break camp if no
  //    rescue attempt happened last round (let the Hunter hunt more aggressively).
  const capturedHere = Object.values(state.players).find(
    (p) => p.status === "captured" && p.roomId === hunter.roomId,
  );
  if (capturedHere) {
    const lastGuardRound = hunter.memory.filter(m => m.roomId === hunter.roomId).at(-1)?.round ?? 0;
    const guardedForRounds = state.round - lastGuardRound;
    // Only guard for at most 1 consecutive round; after that, patrol and come back
    if (guardedForRounds < 2) {
      return { type: "guard", targetPlayerId: capturedHere.id, reason: "guarding captured player" };
    }
  }

  // 2. Chase last known target if still reachable
  if (hunter.lastKnownTargetId) {
    const target = state.players[hunter.lastKnownTargetId];
    if (
      target &&
      (target.status === "active" || target.status === "injured") &&
      reachable(target.roomId)
    ) {
      return { type: "chase", targetPlayerId: target.id, reason: "pursuing last known target" };
    }
  }

  // 3. Chase any injured player in reachable range
  const injured = Object.values(state.players).find(
    (p) => p.status === "injured" && reachable(p.roomId),
  );
  if (injured) {
    return { type: "chase", targetPlayerId: injured.id, reason: "injured player nearby" };
  }

  // 4. Chase noisy player (panic + high noise)
  const noisyTarget = _findNoisyTarget(state, reachable);
  if (noisyTarget) {
    return { type: "chase", targetPlayerId: noisyTarget, reason: "noisy player detected" };
  }

  // 5. Block exit if machines nearly done and gate reachable
  if (state.machinesRepaired >= MACHINES_TO_WIN - 1) {
    for (const gateId of GATE_ROOMS) {
      if (reachable(gateId)) {
        return { type: "blockExit", gateRoomId: gateId, reason: "blocking exit – machines almost done" };
      }
    }
  }

  // 6. Trap high-value room (fires before listen when score is meaningful)
  const trapResult = _findTrapTarget(state, reachable, hunter.trappedRooms);
  if (trapResult && hunter.trappedRooms.length < 3 && trapResult.score >= 3) {
    return { type: "trap", roomId: trapResult.roomId, reason: "trapping high-value room" };
  }

  // 7. Listen at highest-noise reachable room
  const noisyRoom = _highestNoiseRoom(state, reachable);
  if (noisyRoom && state.noiseMap[noisyRoom] > 0) {
    return { type: "listen", roomId: noisyRoom, reason: "heard noise" };
  }

  // 8. Trap fallback (lower-value rooms after listen)
  if (trapResult && hunter.trappedRooms.length < 3) {
    return { type: "trap", roomId: trapResult.roomId, reason: "trapping frequented room" };
  }

  // 9. Patrol toward last known noise or a machine room
  const patrol = _patrolTarget(state, reachable);
  return { type: "patrol", roomId: patrol, reason: "patrolling" };
}

function _findNoisyTarget(
  state: GameState,
  reachable: (id: RoomId) => boolean,
): PlayerId | null {
  let best: PlayerId | null = null;
  let bestScore = 0;

  for (const player of Object.values(state.players)) {
    if (player.status !== "active" && player.status !== "injured") continue;
    if (!reachable(player.roomId)) continue;
    const noise = state.noiseMap[player.roomId] ?? 0;
    const fearBonus = player.heartbeat === "panicking" ? 2 : 0;
    const score = noise + fearBonus;
    if (score > bestScore) {
      bestScore = score;
      best = player.id;
    }
  }

  // Threshold 3: a single repair (noise=2) alone doesn't trigger a chase,
  // but repair + any other noise source, or a panicking player, does.
  return bestScore >= 3 ? best : null;
}

function _highestNoiseRoom(
  state: GameState,
  reachable: (id: RoomId) => boolean,
): RoomId | null {
  let best: RoomId | null = null;
  let bestNoise = 0;

  for (const [id, noise] of Object.entries(state.noiseMap)) {
    if (!reachable(id as RoomId)) continue;
    if (noise > bestNoise) {
      bestNoise = noise;
      best = id as RoomId;
    }
  }

  return best;
}

function _findTrapTarget(
  state: GameState,
  reachable: (id: RoomId) => boolean,
  alreadyTrapped: RoomId[],
): { roomId: RoomId; score: number } | null {
  let bestRoom: RoomId | null = null;
  let bestScore = 0;

  for (const [id, room] of Object.entries(state.rooms)) {
    const roomId = id as RoomId;
    if (!reachable(roomId)) continue;
    if (alreadyTrapped.includes(roomId)) continue;
    if (room.hasTrap) continue;

    let score = 0;

    // High-progress generator in this room
    if (room.machineId && room.machineProgress >= 60 && room.machineProgress < 100) {
      score += 3;
    }

    // Adjacent to a high-progress generator
    for (const adj of ADJACENCY[roomId]) {
      const adjRoom = state.rooms[adj];
      if (adjRoom.machineId && adjRoom.machineProgress >= 60 && adjRoom.machineProgress < 100) {
        score += 2;
        break;
      }
    }

    // Route to a captured player — rescue interdiction
    const capturedAdjacent = Object.values(state.players).some(
      p => p.status === "captured" && ADJACENCY[roomId].includes(p.roomId),
    );
    if (capturedAdjacent) score += 2;

    // Gate-adjacent room when machines are advancing
    const nearGate = GATE_ROOMS.some(g => g === roomId || ADJACENCY[roomId].includes(g));
    if (nearGate && state.machinesRepaired >= 3) score += 2;

    // Current survivor occupancy
    const occupants = Object.values(state.players).filter(
      p => (p.status === "active" || p.status === "injured") && p.roomId === roomId,
    ).length;
    score += occupants;

    // High-connectivity corridors attract traffic
    if (ADJACENCY[roomId].length >= 4) score += 1;

    // Slight penalty for Hunter's own room
    if (roomId === state.hunter.roomId) score -= 1;

    if (score > bestScore) {
      bestScore = score;
      bestRoom = roomId;
    }
  }

  return bestRoom ? { roomId: bestRoom, score: bestScore } : null;
}

function _patrolTarget(
  state: GameState,
  reachable: (id: RoomId) => boolean,
): RoomId {
  const adj = ADJACENCY[state.hunter.roomId];
  const recentRooms = new Set(state.hunter.memory.slice(-3).map((m) => m.roomId));
  const fresh = adj.filter((id) => !recentRooms.has(id));
  const candidates = fresh.length > 0 ? fresh : adj;

  // 35% chance: random patrol to a fresh adjacent room (unpredictable pressure)
  if (rng() < 0.35 && candidates.length > 0) {
    return candidates[Math.floor(rng() * candidates.length)] ?? state.hunter.roomId;
  }

  // Otherwise pursue highest-progress unrepaired machine in reach
  let best: RoomId | null = null;
  let bestProgress = -1;

  for (const [id, room] of Object.entries(state.rooms)) {
    const roomId = id as RoomId;
    if (!reachable(roomId) || !room.machineId || room.machineProgress >= 100) continue;
    if (room.machineProgress > bestProgress) {
      bestProgress = room.machineProgress;
      best = roomId;
    }
  }

  if (best) return best;

  // Fall back to first fresh adjacent room
  return candidates[0] ?? state.hunter.roomId;
}
