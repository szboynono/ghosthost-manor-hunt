import type { RoomId, Role, PlayerId } from "./types";

export const ROOM_NAMES: Record<RoomId, string> = {
  library:    "Library",
  eastHall:   "East Hall",
  kitchen:    "Kitchen",
  basement:   "Basement",
  lobby:      "Lobby",
  greenhouse: "Greenhouse",
  boilerRoom: "Boiler Room",
  gateA:      "Gate A",
  gateB:      "Gate B",
};

// Grid positions [col, row] for 3x3 map
export const ROOM_POSITIONS: Record<RoomId, [number, number]> = {
  library:    [0, 0],
  eastHall:   [1, 0],
  kitchen:    [2, 0],
  basement:   [0, 1],
  lobby:      [1, 1],
  greenhouse: [2, 1],
  boilerRoom: [0, 2],
  gateA:      [1, 2],
  gateB:      [2, 2],
};

export const ADJACENCY: Record<RoomId, RoomId[]> = {
  library:    ["eastHall", "basement"],
  eastHall:   ["library", "kitchen", "lobby"],
  kitchen:    ["eastHall", "greenhouse"],
  basement:   ["library", "lobby", "boilerRoom"],
  lobby:      ["eastHall", "basement", "greenhouse", "gateA"],
  greenhouse: ["kitchen", "lobby", "gateB"],
  boilerRoom: ["basement", "gateA"],
  gateA:      ["lobby", "boilerRoom"],
  gateB:      ["greenhouse"],
};

export const MACHINE_ROOMS: RoomId[] = [
  "library", "kitchen", "basement", "greenhouse", "boilerRoom",
];

export const GATE_ROOMS: RoomId[] = ["gateA", "gateB"];

export const ALL_ROOM_IDS: RoomId[] = [
  "library", "eastHall", "kitchen",
  "basement", "lobby", "greenhouse",
  "boilerRoom", "gateA", "gateB",
];

export const ROOM_DANGER: Record<RoomId, number> = {
  library:    1,
  eastHall:   1,
  kitchen:    1,
  basement:   2,
  lobby:      1,
  greenhouse: 1,
  boilerRoom: 2,
  gateA:      1,
  gateB:      1,
};

export const ACTION_NOISE: Record<string, number> = {
  move:     1,
  repair:   1,  // single repair no longer immediately reveals position
  hide:     0,
  scout:    1,
  rescue:   2,
  heal:     0,
  distract: 3,
  wait:     0,
};

export const REPAIR_PROGRESS: Record<Role, number> = {
  mechanic: 50,
  medic:    25,
  scout:    25,
  decoy:    25,
};

export const CAPTURE_COUNTDOWN = 3;
export const MACHINES_TO_WIN = 5;
export const ELIMINATIONS_TO_WIN = 3;
export const HUNTER_START_ROOM: RoomId = "eastHall";

// Default controlled player for local single-player.
// Future Discord: replace with Discord user → player-slot assignment at session join.
export const DEFAULT_LOCAL_PLAYER_ID: PlayerId = "p1";

export const PLAYER_NAMES = ["Alex", "Blake", "Casey", "Dana"] as const;
export const PLAYER_ROLES: Role[] = ["mechanic", "medic", "scout", "decoy"];
export const PLAYER_START_ROOMS: RoomId[] = ["library", "kitchen", "greenhouse", "boilerRoom"];
export const PLAYER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"] as const;

export const ROLE_DESCRIPTIONS: Record<Role, { title: string; ability: string; goal: string }> = {
  mechanic: {
    title: "The Mechanic",
    ability: "Repairs generators 2× faster",
    goal: "Get all 5 machines running. Your speed is the team's lifeline.",
  },
  medic: {
    title: "The Medic",
    ability: "Heals & rescues teammates",
    goal: "Keep the team alive. A rescued survivor is a second chance.",
  },
  scout: {
    title: "The Scout",
    ability: "Reveals Hunter danger clues",
    goal: "See the unseen. Warn your team before The Warden strikes.",
  },
  decoy: {
    title: "The Decoy",
    ability: "Distracts the Hunter with noise",
    goal: "Lead The Warden astray. Buy time for the team to escape.",
  },
};
