import type {
  GameState, SurvivorAction, HunterAction, PlayerId, RoomId,
  Player, Room, ChaseChoice, GameEvent,
} from "./types";
import {
  ADJACENCY, ACTION_NOISE, REPAIR_PROGRESS,
  CAPTURE_COUNTDOWN, MACHINES_TO_WIN, ELIMINATIONS_TO_WIN,
  GATE_ROOMS,
} from "./constants";

// ─── Seeded RNG (deterministic for tests) ────────────────────────────────────

let _seed = Date.now();
export function setSeed(s: number) { _seed = s; }
export function rng(): number {
  _seed ^= _seed << 13;
  _seed ^= _seed >> 7;
  _seed ^= _seed << 17;
  return ((_seed >>> 0) % 10000) / 10000;
}

// ─── Action availability ─────────────────────────────────────────────────────

export function getAvailableActions(state: GameState, playerId: PlayerId): SurvivorAction[] {
  const player = state.players[playerId];
  if (player.status !== "active" && player.status !== "injured") return [];

  const room = state.rooms[player.roomId];
  const actions: SurvivorAction[] = [{ type: "wait" }, { type: "hide" }];

  for (const targetRoomId of ADJACENCY[player.roomId]) {
    if (!state.rooms[targetRoomId].isLocked) {
      actions.push({ type: "move", targetRoomId });
    }
  }

  if (room.machineId && room.machineProgress < 100) {
    actions.push({ type: "repair" });
  }

  actions.push({ type: "scout" });

  const capturedHere = Object.values(state.players).find(
    (p) => p.status === "captured" && p.roomId === player.roomId && p.id !== playerId,
  );
  if (capturedHere) {
    actions.push({ type: "rescue", targetPlayerId: capturedHere.id });
  }

  if (player.role === "medic") {
    const injuredHere = Object.values(state.players).find(
      (p) => p.status === "injured" && p.roomId === player.roomId && p.id !== playerId,
    );
    if (injuredHere) {
      actions.push({ type: "heal", targetPlayerId: injuredHere.id });
    }
  }

  if (player.role === "decoy") {
    actions.push({ type: "distract" });
  }

  return actions;
}

// ─── Noise helpers ────────────────────────────────────────────────────────────

function addRoomNoise(state: GameState, roomId: RoomId, amount: number): GameState {
  return {
    ...state,
    noiseMap: { ...state.noiseMap, [roomId]: (state.noiseMap[roomId] ?? 0) + amount },
    rooms: {
      ...state.rooms,
      [roomId]: {
        ...state.rooms[roomId],
        noiseLevel: (state.rooms[roomId].noiseLevel ?? 0) + amount,
      },
    },
  };
}

// ─── Apply a single survivor action ──────────────────────────────────────────

export function applyPlayerAction(
  state: GameState,
  playerId: PlayerId,
  action: SurvivorAction,
): GameState {
  const player = state.players[playerId];
  const available = getAvailableActions(state, playerId);

  const valid = available.some((a) => {
    if (a.type !== action.type) return false;
    if (action.type === "move" && a.type === "move")
      return a.targetRoomId === action.targetRoomId;
    if (action.type === "rescue" && a.type === "rescue")
      return a.targetPlayerId === action.targetPlayerId;
    if (action.type === "heal" && a.type === "heal")
      return a.targetPlayerId === action.targetPlayerId;
    return true;
  });

  if (!valid) return state;

  const noise = ACTION_NOISE[action.type] ?? 0;
  let s = addRoomNoise(state, player.roomId, noise);

  switch (action.type) {
    case "move": {
      s = {
        ...s,
        players: {
          ...s.players,
          [playerId]: {
            ...player,
            roomId: action.targetRoomId,
            isHiding: false,
            noise,
            movedThisRound: true,
            stats: { ...player.stats, noiseMade: player.stats.noiseMade + noise },
          },
        },
        rooms: {
          ...s.rooms,
          [player.roomId]: { ...s.rooms[player.roomId], hasFootprints: true },
        },
      };
      break;
    }
    case "repair": {
      const room = s.rooms[player.roomId];
      const repairAmt = REPAIR_PROGRESS[player.role];
      const newProgress = Math.min(100, room.machineProgress + repairAmt);
      const justFinished = room.machineProgress < 100 && newProgress >= 100;
      s = {
        ...s,
        rooms: {
          ...s.rooms,
          [player.roomId]: { ...room, machineProgress: newProgress },
        },
        machinesRepaired: justFinished ? s.machinesRepaired + 1 : s.machinesRepaired,
        players: {
          ...s.players,
          [playerId]: {
            ...player,
            noise,
            stats: {
              ...player.stats,
              repairsContributed: player.stats.repairsContributed + 1,
              noiseMade: player.stats.noiseMade + noise,
            },
          },
        },
      };
      break;
    }
    case "hide": {
      s = {
        ...s,
        players: {
          ...s.players,
          [playerId]: { ...player, isHiding: true, noise: 0 },
        },
      };
      break;
    }
    case "scout": {
      s = _applyScout(s, playerId);
      s = {
        ...s,
        players: {
          ...s.players,
          [playerId]: {
            ...s.players[playerId],
            noise,
            stats: { ...s.players[playerId].stats, noiseMade: s.players[playerId].stats.noiseMade + noise },
          },
        },
      };
      break;
    }
    case "rescue": {
      const target = s.players[action.targetPlayerId];
      if (target?.status === "captured" && target.roomId === player.roomId) {
        s = {
          ...s,
          players: {
            ...s.players,
            [action.targetPlayerId]: {
              ...target,
              status: "injured",
              captureCountdown: 0,
              health: Math.max(1, target.health),
            },
            [playerId]: {
              ...player,
              noise,
              stats: {
                ...player.stats,
                rescuesPerformed: player.stats.rescuesPerformed + 1,
                noiseMade: player.stats.noiseMade + noise,
              },
            },
          },
        };
      }
      break;
    }
    case "heal": {
      const target = s.players[action.targetPlayerId];
      if (target?.status === "injured" && target.roomId === player.roomId) {
        s = {
          ...s,
          players: {
            ...s.players,
            [action.targetPlayerId]: {
              ...target,
              status: "active",
              health: Math.min(3, target.health + 1),
            },
            [playerId]: {
              ...player,
              noise,
              stats: {
                ...player.stats,
                healsPerformed: player.stats.healsPerformed + 1,
              },
            },
          },
        };
      }
      break;
    }
    case "distract": {
      s = addRoomNoise(s, player.roomId, 2); // bonus noise on top of base
      s = {
        ...s,
        players: {
          ...s.players,
          [playerId]: {
            ...player,
            noise: 3,
            stats: {
              ...player.stats,
              distracionsPerformed: player.stats.distracionsPerformed + 1,
              noiseMade: player.stats.noiseMade + 3,
            },
          },
        },
      };
      break;
    }
    case "wait": {
      s = {
        ...s,
        players: {
          ...s.players,
          [playerId]: { ...player, fear: Math.max(0, player.fear - 5), noise: 0 },
        },
      };
      break;
    }
  }

  return s;
}

function _applyScout(state: GameState, playerId: PlayerId): GameState {
  const player = state.players[playerId];
  let s = { ...state, rooms: { ...state.rooms } };
  for (const adjId of ADJACENCY[player.roomId]) {
    if (state.hunter.roomId === adjId) {
      s = {
        ...s,
        rooms: {
          ...s.rooms,
          [adjId]: {
            ...s.rooms[adjId],
            fogLevel: Math.min(3, s.rooms[adjId].fogLevel + 2),
            scratchMarks: true,
          },
        },
      };
    }
  }
  return s;
}

// ─── Hunter action validation ─────────────────────────────────────────────────

export function isHunterActionValid(state: GameState, action: HunterAction): boolean {
  const adj = ADJACENCY[state.hunter.roomId];
  const reachable = (id: RoomId) => id === state.hunter.roomId || adj.includes(id);

  switch (action.type) {
    case "patrol":
    case "listen":
      return reachable(action.roomId);
    case "trap":
      return reachable(action.roomId);
    case "chase": {
      const t = state.players[action.targetPlayerId];
      return !!t &&
        t.status !== "eliminated" &&
        t.status !== "escaped" &&
        reachable(t.roomId);
    }
    case "guard": {
      const t = state.players[action.targetPlayerId];
      return !!t && t.status === "captured" && t.roomId === state.hunter.roomId;
    }
    case "blockExit": {
      const r = state.rooms[action.gateRoomId];
      return r?.isGate === true && reachable(action.gateRoomId);
    }
  }
}

export function applyHunterAction(state: GameState, action: HunterAction): GameState {
  if (!isHunterActionValid(state, action)) {
    const fallback: HunterAction = {
      type: "patrol",
      roomId: state.hunter.roomId,
      reason: "fallback – original action invalid",
    };
    return _applyHunterValidated(state, fallback);
  }
  return _applyHunterValidated(state, action);
}

function _applyHunterValidated(state: GameState, action: HunterAction): GameState {
  let hunter = { ...state.hunter };
  let s: GameState = { ...state, hunterAction: action };

  switch (action.type) {
    case "patrol": {
      hunter = {
        ...hunter,
        roomId: action.roomId,
        isAlerted: false,
        memory: [...hunter.memory, { roomId: action.roomId, round: state.round }].slice(-10),
      };
      s = {
        ...s,
        rooms: {
          ...s.rooms,
          [action.roomId]: {
            ...s.rooms[action.roomId],
            fogLevel: Math.min(3, s.rooms[action.roomId].fogLevel + 1),
          },
        },
      };
      break;
    }
    case "listen": {
      hunter = { ...hunter, roomId: action.roomId, isAlerted: true };
      break;
    }
    case "chase": {
      const target = state.players[action.targetPlayerId];
      hunter = {
        ...hunter,
        roomId: target.roomId,
        lastKnownTargetId: action.targetPlayerId,
        isAlerted: true,
        memory: [...hunter.memory, { roomId: target.roomId, round: state.round }].slice(-10),
      };
      break;
    }
    case "trap": {
      hunter = {
        ...hunter,
        trappedRooms: [...new Set([...hunter.trappedRooms, action.roomId])],
      };
      s = {
        ...s,
        rooms: {
          ...s.rooms,
          [action.roomId]: { ...s.rooms[action.roomId], hasTrap: true },
        },
      };
      break;
    }
    case "guard": {
      const t = state.players[action.targetPlayerId];
      hunter = { ...hunter, roomId: t.roomId };
      break;
    }
    case "blockExit": {
      hunter = {
        ...hunter,
        roomId: action.gateRoomId,
        blockedExits: [...new Set([...hunter.blockedExits, action.gateRoomId])],
      };
      s = {
        ...s,
        rooms: {
          ...s.rooms,
          [action.gateRoomId]: { ...s.rooms[action.gateRoomId], isGateOpen: false },
        },
      };
      break;
    }
  }

  s = { ...s, hunter };
  s = _resolveEncounters(s);
  return s;
}

// ─── Encounter resolution ─────────────────────────────────────────────────────

function _resolveEncounters(state: GameState): GameState {
  let s = state;
  const inRoom = Object.values(state.players).filter(
    (p) =>
      p.roomId === state.hunter.roomId &&
      (p.status === "active" || p.status === "injured"),
  );

  for (const player of inRoom) {
    if (player.isHiding) {
      const hideOk = _resolveHide(player, state.rooms[player.roomId]);
      if (!hideOk) {
        s = _injureOrCapture(s, player.id);
        s = _pushEvent(s, {
          type: "found",
          title: "Close Call!",
          description: `${player.name} was found hiding. The Warden drags them out.`,
          icon: "👁",
          severity: "danger",
        });
      } else {
        s = _pushEvent(s, {
          type: "closeCall",
          title: "Close Call",
          description: `The Warden passed right by ${player.name}... they held their breath.`,
          icon: "💨",
          severity: "warning",
        });
      }
    } else if (!s.pendingChase) {
      s = {
        ...s,
        pendingChase: { playerId: player.id, hunterRoomId: state.hunter.roomId, round: state.round },
        phase: "chaseEncounter",
      };
    }
  }

  return s;
}

function _resolveHide(player: Player, room: Room): boolean {
  // Scout is best hider; panicking players and dangerous rooms reduce success
  const fearPenalty = (player.fear / 100) * 0.22;
  const dangerPenalty = room.dangerLevel * 0.04;
  const base = player.role === "scout" ? 0.90 : 0.84;
  const chance = Math.max(0.15, base - fearPenalty - dangerPenalty);
  return rng() < chance;
}

// ─── Chase encounter resolution ───────────────────────────────────────────────

export function resolveChaseChoice(
  state: GameState,
  playerId: PlayerId,
  choice: ChaseChoice,
): GameState {
  const player = state.players[playerId];
  const fearFactor = player.fear / 100;

  let escapeChance: number;
  switch (choice) {
    case "holdBreath":
      // Good if calm; fear penalty is gentler so even panicking players have a chance
      escapeChance = 0.70 - fearFactor * 0.28;
      break;
    case "run":
      // Scout gets a speed bonus; moderate fear penalty
      escapeChance = 0.60 - fearFactor * 0.18 + (player.role === "scout" ? 0.15 : 0);
      break;
    case "throwObject":
      // Best raw odds; Decoy is especially good at this
      escapeChance = 0.75 - fearFactor * 0.18 + (player.role === "decoy" ? 0.15 : 0);
      break;
    case "callForHelp": {
      const nearTeam = Object.values(state.players).filter(
        (p) =>
          p.id !== playerId &&
          p.status === "active" &&
          ADJACENCY[player.roomId].includes(p.roomId),
      ).length;
      escapeChance = 0.35 + nearTeam * 0.22;
      break;
    }
  }

  escapeChance = Math.max(0.05, Math.min(0.95, escapeChance));
  const escaped = rng() < escapeChance;

  let s: GameState = { ...state, pendingChase: null, phase: "resolving" as const };

  if (escaped) {
    const newFear = Math.min(100, player.fear + 20);
    s = {
      ...s,
      players: {
        ...s.players,
        [playerId]: { ...player, fear: newFear, heartbeat: _heartbeat(newFear) },
      },
    };
    s = _pushEvent(s, {
      type: "escaped",
      title: "Barely Escaped!",
      description: `${player.name} got away from The Warden — for now.`,
      icon: "🏃",
      severity: "warning",
    });
  } else {
    s = _injureOrCapture(s, playerId);
    s = _pushEvent(s, {
      type: "captured",
      title: `${player.name} Captured!`,
      description: "The Warden has them. Rescue quickly.",
      icon: "🔒",
      severity: "danger",
    });
  }

  return s;
}

// ─── Injury / capture ─────────────────────────────────────────────────────────

function _injureOrCapture(state: GameState, playerId: PlayerId): GameState {
  const player = state.players[playerId];
  const becomesCaptured = player.status === "injured";
  const newStatus = becomesCaptured ? "captured" : "injured";

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        status: newStatus,
        captureCountdown: becomesCaptured ? CAPTURE_COUNTDOWN : 0,
        isHiding: false,
        health: Math.max(0, player.health - 1),
        stats: {
          ...player.stats,
          timesCapture: player.stats.timesCapture + (becomesCaptured ? 1 : 0),
        },
      },
    },
    totalCaptures: becomesCaptured ? state.totalCaptures + 1 : state.totalCaptures,
  };
}

// ─── Trap resolution ─────────────────────────────────────────────────────────

export function resolveTrapTriggers(state: GameState): GameState {
  let s = state;

  for (const [id, player] of Object.entries(state.players)) {
    const pid = id as PlayerId;
    if (!player.movedThisRound) continue;
    if (player.status !== "active" && player.status !== "injured") continue;

    const room = s.rooms[player.roomId];
    if (!room.hasTrap) continue;

    const wasInjured = player.status === "injured";

    // Fear spike — same for both paths
    const newFear = Math.min(100, s.players[pid].fear + 25);
    s = {
      ...s,
      players: {
        ...s.players,
        [pid]: { ...s.players[pid], fear: newFear, heartbeat: _heartbeat(newFear) },
      },
    };

    // Clear trap and remove from Hunter's tracked list
    s = {
      ...s,
      rooms: { ...s.rooms, [player.roomId]: { ...s.rooms[player.roomId], hasTrap: false } },
      hunter: {
        ...s.hunter,
        trappedRooms: s.hunter.trappedRooms.filter((r) => r !== player.roomId),
      },
    };

    // Active survivors: fear only — survivable on first hit.
    // Already-injured survivors: severe path — injury → captured.
    if (wasInjured) {
      s = _injureOrCapture(s, pid);
    }

    s = _pushEvent(s, {
      type: "trapTriggered",
      title: "Trap Sprung!",
      description: wasInjured
        ? `${player.name} already hurt — the trap has them.`
        : `${player.name} hit The Warden's trap. Fear rising.`,
      icon: "⚠️",
      severity: "danger",
    });
  }

  return s;
}

// ─── End-of-round updates ─────────────────────────────────────────────────────

export function updateFear(state: GameState): GameState {
  let s = { ...state, players: { ...state.players } };

  for (const [id, player] of Object.entries(state.players)) {
    const pid = id as PlayerId;
    if (player.status === "eliminated" || player.status === "escaped") continue;

    let delta = 0;
    const adj = ADJACENCY[player.roomId];
    // Reduced proximity fear — manor is small, Hunter is always "close"
    if (state.hunter.roomId === player.roomId) delta += 20;
    else if (adj.includes(state.hunter.roomId)) delta += 8;

    const teammates = Object.values(state.players).filter(
      (p) => p.id !== pid && p.status === "active" && p.roomId === player.roomId,
    ).length;
    delta += teammates > 0 ? -6 : 4;

    const captured = Object.values(state.players).filter((p) => p.status === "captured").length;
    delta += captured * 4;

    if (player.status === "injured") delta += 8;
    if (player.isHiding) delta -= 12;
    delta += state.rooms[player.roomId].dangerLevel * 2;

    const newFear = Math.max(0, Math.min(100, player.fear + delta));
    s.players[pid] = { ...player, fear: newFear, heartbeat: _heartbeat(newFear) };
  }

  return s;
}

export function updateCaptureCountdowns(state: GameState): GameState {
  let s = { ...state, players: { ...state.players } };
  let elims = state.eliminations;

  for (const [id, player] of Object.entries(state.players)) {
    const pid = id as PlayerId;
    if (player.status !== "captured") continue;

    const next = player.captureCountdown - 1;
    if (next <= 0) {
      s.players[pid] = { ...player, status: "eliminated", captureCountdown: 0 };
      elims++;
      s = _pushEvent(s, {
        type: "eliminated",
        title: `${player.name} Eliminated`,
        description: "No rescue in time. The manor claims another soul.",
        icon: "💀",
        severity: "danger",
      });
    } else {
      s.players[pid] = { ...player, captureCountdown: next };
    }
  }

  return { ...s, eliminations: elims };
}

export function updateGates(state: GameState): GameState {
  if (state.machinesRepaired < MACHINES_TO_WIN) return state;

  let rooms = { ...state.rooms };
  for (const gateId of GATE_ROOMS) {
    if (!state.hunter.blockedExits.includes(gateId)) {
      rooms[gateId] = { ...rooms[gateId], isGateOpen: true };
    }
  }
  return { ...state, rooms };
}

export function resolveEscapes(state: GameState): GameState {
  let s = state;
  for (const [id, player] of Object.entries(state.players)) {
    const pid = id as PlayerId;
    if (player.status !== "active" && player.status !== "injured") continue;
    const room = state.rooms[player.roomId];
    if (room.isGate && room.isGateOpen) {
      s = {
        ...s,
        players: {
          ...s.players,
          [pid]: { ...s.players[pid], status: "escaped" },
        },
      };
      s = _pushEvent(s, {
        type: "escaped",
        title: "Exit Gate Unlocked!",
        description: `${player.name} has escaped through ${room.name}!`,
        icon: "🚪",
        severity: "success",
      });
    }
  }
  return s;
}

export function clearRoundNoise(state: GameState): GameState {
  const noiseMap: Record<RoomId, number> = {} as Record<RoomId, number>;
  const rooms = { ...state.rooms };
  for (const id of Object.keys(state.rooms) as RoomId[]) {
    noiseMap[id] = 0;
    rooms[id] = { ...rooms[id], noiseLevel: 0 };
  }
  return { ...state, noiseMap, rooms };
}

export function checkWinCondition(state: GameState): "survivors" | "hunter" | null {
  if (state.eliminations >= ELIMINATIONS_TO_WIN) return "hunter";
  const escaped = Object.values(state.players).filter((p) => p.status === "escaped").length;
  if (state.machinesRepaired >= MACHINES_TO_WIN && escaped >= 1) return "survivors";
  return null;
}

export function advanceRound(state: GameState): GameState {
  const history = [
    ...state.roundHistory,
    { round: state.round, events: state.currentEvent ? [state.currentEvent] : [] },
  ];
  return {
    ...clearRoundNoise(state),
    round: state.round + 1,
    phase: "survivorsChoosing",
    survivorActions: {},
    hunterAction: null,
    currentEvent: null,
    roundHistory: history,
    players: Object.fromEntries(
      Object.entries(state.players).map(([id, p]) => [id, { ...p, isHiding: false, noise: 0, movedThisRound: false }]),
    ) as Record<PlayerId, Player>,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _heartbeat(fear: number): Player["heartbeat"] {
  if (fear < 25) return "calm";
  if (fear < 50) return "uneasy";
  if (fear < 75) return "racing";
  return "panicking";
}

function _pushEvent(state: GameState, event: GameEvent): GameState {
  return {
    ...state,
    events: [...state.events, event],
    currentEvent: event,
  };
}
