import type { GameState, GameEvent, RoomId } from "./types";
import { createInitialState } from "./initialState";

function evt(
  type: string, title: string, description: string,
  icon: string, severity: GameEvent["severity"],
): GameEvent {
  return { type, title, description, icon, severity };
}

export function buildDemoStates(): GameState[] {
  const base = createInitialState();
  const r = base.rooms;
  const pl = base.players;
  const h = base.hunter;
  const nm = base.noiseMap;

  const states: GameState[] = [];

  // 0 — The Hunt Begins
  states.push({ ...base });

  // 1 — Repairs underway
  states.push({
    ...base,
    round: 3,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 70 },
      kitchen:    { ...r["kitchen"],    machineProgress: 40 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 55 },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "library" },
      p2: { ...pl["p2"], roomId: "kitchen" },
    },
    hunter: { ...h, roomId: "lobby" },
    noiseMap: { ...nm, library: 2 },
  });

  // 2 — Repair flash: library 70% → 100%
  states.push({
    ...base,
    round: 4,
    machinesRepaired: 1,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 40 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 55 },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "library" },
      p2: { ...pl["p2"], roomId: "kitchen" },
    },
    hunter: { ...h, roomId: "lobby" },
    phase: "showingEvent",
    currentEvent: evt("repairComplete", "Generator Online!", "Power surges through the manor walls.", "⚡", "success"),
  });

  // 3 — Mid-game: 3 machines done
  states.push({
    ...base,
    round: 8,
    machinesRepaired: 3,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 60 },
      greenhouse: { ...r["greenhouse"], machineProgress: 30 },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "basement", fear: 15, heartbeat: "calm" },
      p2: { ...pl["p2"], roomId: "greenhouse" },
    },
    hunter: { ...h, roomId: "eastHall" },
  });

  // 4 — The Warden closes in: hunter enters basement with p1
  states.push({
    ...base,
    round: 9,
    machinesRepaired: 3,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 60, fogLevel: 3 },
      greenhouse: { ...r["greenhouse"], machineProgress: 30 },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "basement", fear: 65, heartbeat: "racing" },
      p2: { ...pl["p2"], roomId: "greenhouse", fear: 20, heartbeat: "uneasy" },
    },
    hunter: { ...h, roomId: "basement", isAlerted: true },
    phase: "showingEvent",
    currentEvent: evt("hunterAlerted", "The Warden Is Here", "Silence. Heavy footsteps. Stay still.", "👁", "danger"),
  });

  // 5 — Chase encounter: The Warden finds p1 in basement
  states.push({
    ...base,
    round: 9,
    machinesRepaired: 3,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 60, fogLevel: 3 },
      greenhouse: { ...r["greenhouse"], machineProgress: 30 },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "basement", fear: 65, heartbeat: "racing" },
      p2: { ...pl["p2"], roomId: "greenhouse", fear: 20, heartbeat: "uneasy" },
    },
    hunter: { ...h, roomId: "basement", isAlerted: true },
    phase: "chaseEncounter",
    pendingChase: { playerId: "p1", hunterRoomId: "basement" as RoomId, round: 9 },
  });

  // 6 — Trap set in basement: p1 fled to library
  states.push({
    ...base,
    round: 10,
    machinesRepaired: 3,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 60, hasTrap: true },
      greenhouse: { ...r["greenhouse"], machineProgress: 30 },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "library", fear: 55, heartbeat: "racing" },
      p2: { ...pl["p2"], roomId: "greenhouse", fear: 20, heartbeat: "uneasy" },
    },
    hunter: { ...h, roomId: "eastHall", trappedRooms: ["basement"] as RoomId[] },
    phase: "showingEvent",
    currentEvent: evt("trapPlaced", "A Trap Is Set", "The Warden is patient. Watch where you step.", "⚠️", "warning"),
  });

  // 7 — p2 approaches basement (trap still active, p2 active in lobby)
  states.push({
    ...base,
    round: 11,
    machinesRepaired: 3,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 60, hasTrap: true },
      greenhouse: { ...r["greenhouse"], machineProgress: 30 },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "library", fear: 55, heartbeat: "racing" },
      p2: { ...pl["p2"], roomId: "lobby", fear: 25, heartbeat: "calm" },
    },
    hunter: { ...h, roomId: "kitchen", trappedRooms: ["basement"] as RoomId[] },
  });

  // 8 — Trap triggered! p2 active+panicking in basement (trap cleared)
  states.push({
    ...base,
    round: 11,
    machinesRepaired: 3,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 60, hasTrap: false },
      greenhouse: { ...r["greenhouse"], machineProgress: 30 },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "library", fear: 55, heartbeat: "racing" },
      p2: { ...pl["p2"], roomId: "basement", fear: 70, heartbeat: "panicking" },
    },
    hunter: { ...h, roomId: "kitchen" },
    phase: "showingEvent",
    currentEvent: evt("trapTriggered", "Trap Sprung!", "A snap of metal. The Warden will have heard that.", "⚠️", "danger"),
  });

  // 9 — Capture shake: p2 status transitions active → captured
  states.push({
    ...base,
    round: 12,
    machinesRepaired: 3,
    totalCaptures: 1,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 60 },
      greenhouse: { ...r["greenhouse"], machineProgress: 30 },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "library", fear: 55, heartbeat: "racing" },
      p2: { ...pl["p2"], roomId: "basement", fear: 85, heartbeat: "panicking", status: "captured", captureCountdown: 3 },
    },
    hunter: { ...h, roomId: "basement" },
    phase: "showingEvent",
    currentEvent: evt("captured", "Captured!", "The Warden's grip is iron. No escape.", "💀", "danger"),
  });

  // 10 — Rescue: p1 moves to basement, p2 freed
  states.push({
    ...base,
    round: 13,
    machinesRepaired: 3,
    totalCaptures: 1,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 60 },
      greenhouse: { ...r["greenhouse"], machineProgress: 30 },
    },
    players: {
      ...pl,
      p1: {
        ...pl["p1"],
        roomId: "basement",
        fear: 55,
        heartbeat: "racing",
        stats: { ...pl["p1"].stats, rescuesPerformed: 1 },
      },
      p2: { ...pl["p2"], roomId: "basement", fear: 60, heartbeat: "racing", status: "injured", captureCountdown: 0 },
    },
    hunter: { ...h, roomId: "lobby" },
    phase: "showingEvent",
    currentEvent: evt("rescued", "Rescued!", "Pulled from the chair — barely breathing.", "🩺", "success"),
  });

  // 11 — Gate flash: all 5 generators done, gateA/gateB now open
  states.push({
    ...base,
    round: 16,
    machinesRepaired: 5,
    totalCaptures: 1,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 100 },
      greenhouse: { ...r["greenhouse"], machineProgress: 100 },
      gateA:      { ...r["gateA"],      isGateOpen: true },
      gateB:      { ...r["gateB"],      isGateOpen: true },
    },
    players: {
      ...pl,
      p1: { ...pl["p1"], roomId: "lobby", fear: 30, heartbeat: "uneasy" },
      p2: { ...pl["p2"], roomId: "greenhouse", fear: 45, heartbeat: "uneasy", status: "injured" },
    },
    hunter: { ...h, roomId: "eastHall" },
    phase: "showingEvent",
    currentEvent: evt("gateUnlocked", "Gates Are Open!", "Run. NOW.", "🚪", "success"),
  });

  // 12 — Escape! winner=survivors
  states.push({
    ...base,
    round: 17,
    machinesRepaired: 5,
    totalCaptures: 1,
    rooms: {
      ...r,
      library:    { ...r["library"],    machineProgress: 100 },
      kitchen:    { ...r["kitchen"],    machineProgress: 100 },
      boilerRoom: { ...r["boilerRoom"], machineProgress: 100 },
      basement:   { ...r["basement"],   machineProgress: 100 },
      greenhouse: { ...r["greenhouse"], machineProgress: 100 },
      gateA:      { ...r["gateA"],      isGateOpen: true },
      gateB:      { ...r["gateB"],      isGateOpen: true },
    },
    players: {
      ...pl,
      p1: {
        ...pl["p1"],
        roomId: "gateA",
        fear: 15,
        heartbeat: "calm",
        status: "escaped",
        stats: { ...pl["p1"].stats, rescuesPerformed: 1, repairsContributed: 5 },
      },
      p2: {
        ...pl["p2"],
        roomId: "gateB",
        fear: 30,
        heartbeat: "uneasy",
        status: "escaped",
      },
    },
    hunter: { ...h, roomId: "lobby" },
    winner: "survivors",
    phase: "gameOver",
  });

  return states;
}

export const DEMO_MOMENT_LABELS: string[] = [
  "The Hunt Begins",
  "Repairs Underway",
  "Generator Online!",
  "Mid-Game Tension",
  "The Warden Closes In",
  "Chase — Hold Your Breath!",
  "Trap Set",
  "Into the Trap…",
  "Trap Sprung!",
  "Survivor Captured",
  "Rescue!",
  "All Generators Online",
  "Escape!",
];
