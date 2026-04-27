import type { GameState, Player, Room, HunterState, PlayerId, RoomId } from "./types";
import {
  ALL_ROOM_IDS, ROOM_NAMES, MACHINE_ROOMS, GATE_ROOMS, ROOM_DANGER,
  HUNTER_START_ROOM, PLAYER_NAMES, PLAYER_ROLES, PLAYER_START_ROOMS,
  DEFAULT_LOCAL_PLAYER_ID,
} from "./constants";

function makePlayerStats() {
  return {
    repairsContributed: 0,
    rescuesPerformed: 0,
    timesCapture: 0,
    noiseMade: 0,
    distracionsPerformed: 0,
    healsPerformed: 0,
  };
}

function createPlayer(index: number, localPlayerId: PlayerId): Player {
  const id = `p${index + 1}` as PlayerId;
  return {
    id,
    name: PLAYER_NAMES[index],
    role: PLAYER_ROLES[index],
    roomId: PLAYER_START_ROOMS[index],
    health: 3,
    fear: 0,
    heartbeat: "calm",
    status: "active",
    captureCountdown: 0,
    isHiding: false,
    isControlled: id === localPlayerId,
    noise: 0,
    movedThisRound: false,
    stats: makePlayerStats(),
  };
}

function createRoom(id: RoomId): Room {
  return {
    id,
    name: ROOM_NAMES[id],
    machineId: MACHINE_ROOMS.includes(id) ? `machine_${id}` : null,
    machineProgress: 0,
    isLocked: false,
    isGate: GATE_ROOMS.includes(id),
    isGateOpen: false,
    hasFootprints: false,
    hasTrap: false,
    dangerLevel: ROOM_DANGER[id],
    fogLevel: 0,
    scratchMarks: false,
    noiseLevel: 0,
  };
}

export function createInitialState(
  debugMode = false,
  localPlayerId: PlayerId = DEFAULT_LOCAL_PLAYER_ID,
): GameState {
  const players = {} as Record<PlayerId, Player>;
  for (let i = 0; i < 4; i++) {
    const p = createPlayer(i, localPlayerId);
    players[p.id] = p;
  }

  const rooms = {} as Record<RoomId, Room>;
  for (const id of ALL_ROOM_IDS) {
    rooms[id] = createRoom(id);
  }

  const hunter: HunterState = {
    roomId: HUNTER_START_ROOM,
    lastKnownTargetId: null,
    isAlerted: false,
    trappedRooms: [],
    blockedExits: [],
    memory: [],
  };

  const noiseMap = {} as Record<RoomId, number>;
  for (const id of ALL_ROOM_IDS) {
    noiseMap[id] = 0;
  }

  return {
    round: 1,
    phase: "survivorsChoosing",
    players,
    rooms,
    hunter,
    machinesRepaired: 0,
    totalCaptures: 0,
    eliminations: 0,
    events: [],
    currentEvent: null,
    pendingChase: null,
    survivorActions: {},
    hunterAction: null,
    isDebugMode: debugMode,
    localPlayerId,
    winner: null,
    noiseMap,
    roundHistory: [],
  };
}
