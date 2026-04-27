import type { GameState, SurvivorAction, PlayerId, RoomId } from "./types";
import { getAvailableActions } from "./engine";
import { ADJACENCY, MACHINES_TO_WIN, GATE_ROOMS } from "./constants";

// Simple heuristic autopilot for non-controlled survivors.

export function decideAutopilotAction(state: GameState, playerId: PlayerId): SurvivorAction {
  const player = state.players[playerId];
  const available = getAvailableActions(state, playerId);

  if (available.length === 0) return { type: "wait" };

  const has = (t: SurvivorAction["type"]) => available.some((a) => a.type === t);

  // Medic: rescue or heal takes priority even if Hunter is present (their role ability)
  if (player.role === "medic") {
    const rescueAction = available.find((a) => a.type === "rescue");
    if (rescueAction) return rescueAction;
    const healAction = available.find((a) => a.type === "heal");
    if (healAction) return healAction;
  }

  // Danger: Hunter in same room → hide
  if (state.hunter.roomId === player.roomId && has("hide")) {
    return { type: "hide" };
  }

  // Non-medic rescue (only if Hunter is NOT in the room)
  if (state.hunter.roomId !== player.roomId) {
    const rescueAction = available.find((a) => a.type === "rescue");
    if (rescueAction) return rescueAction;
    const healAction = available.find((a) => a.type === "heal");
    if (healAction) return healAction;
  }

  // Repair machine in current room
  if (has("repair")) return { type: "repair" };

  // Move toward unfinished machine if not already on one
  const targetRoom = _findRepairTarget(state, player.roomId);
  if (targetRoom) {
    const moveAction = available.find(
      (a) => a.type === "move" && a.targetRoomId === targetRoom,
    );
    if (moveAction) return moveAction;
  }

  // All machines done → head for nearest open gate
  if (state.machinesRepaired >= MACHINES_TO_WIN) {
    const gateStep = _nearestGateStep(state, player.roomId);
    if (gateStep) {
      const move = available.find(a => a.type === "move" && a.targetRoomId === gateStep);
      if (move) return move;
    }
  }

  // Distract if decoy and Hunter is nearby
  if (
    player.role === "decoy" &&
    ADJACENCY[player.roomId].includes(state.hunter.roomId) &&
    has("distract")
  ) {
    return { type: "distract" };
  }

  // Scout if hunter is adjacent
  if (ADJACENCY[player.roomId].includes(state.hunter.roomId) && has("scout")) {
    return { type: "scout" };
  }

  // Default: prefer untrapped adjacent room
  const moves = available.filter((a): a is Extract<SurvivorAction, { type: "move" }> => a.type === "move");
  const move = moves.find(a => !state.rooms[a.targetRoomId].hasTrap) ?? moves[0];
  return move ?? { type: "wait" };
}

function _findRepairTarget(state: GameState, fromRoom: RoomId, avoidTraps = true): RoomId | null {
  const parent = new Map<RoomId, RoomId>();
  const queue: RoomId[] = [fromRoom];
  const visited = new Set<RoomId>([fromRoom]);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const room = state.rooms[cur];
    if (room.machineId && room.machineProgress < 100 && cur !== fromRoom) {
      let step = cur;
      while (parent.get(step) !== fromRoom) step = parent.get(step)!;
      return step;
    }
    for (const adj of ADJACENCY[cur]) {
      if (visited.has(adj)) continue;
      if (avoidTraps && state.rooms[adj].hasTrap) continue;
      visited.add(adj);
      parent.set(adj, cur);
      queue.push(adj);
    }
  }

  if (avoidTraps) return _findRepairTarget(state, fromRoom, false);
  return null;
}

function _nearestGateStep(state: GameState, from: RoomId, avoidTraps = true): RoomId | null {
  const openGates = GATE_ROOMS.filter(g => state.rooms[g].isGateOpen);
  if (openGates.length === 0) return null;
  if (openGates.includes(from)) return null;

  const parent = new Map<RoomId, RoomId>();
  const queue: RoomId[] = [from];
  const visited = new Set<RoomId>([from]);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (openGates.includes(cur)) {
      let step = cur;
      while (parent.get(step) !== from) step = parent.get(step)!;
      return step;
    }
    for (const adj of ADJACENCY[cur]) {
      if (visited.has(adj)) continue;
      if (avoidTraps && state.rooms[adj].hasTrap) continue;
      visited.add(adj);
      parent.set(adj, cur);
      queue.push(adj);
    }
  }

  if (avoidTraps) return _nearestGateStep(state, from, false);
  return null;
}
