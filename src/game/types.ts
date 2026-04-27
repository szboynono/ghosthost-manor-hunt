export type RoomId =
  | "library" | "eastHall" | "kitchen"
  | "basement" | "lobby" | "greenhouse"
  | "boilerRoom" | "gateA" | "gateB";

export type PlayerId = "p1" | "p2" | "p3" | "p4";

export type Role = "mechanic" | "medic" | "scout" | "decoy";

export type HeartbeatState = "calm" | "uneasy" | "racing" | "panicking";

export type PlayerStatus = "active" | "injured" | "captured" | "escaped" | "eliminated";

export interface Player {
  id: PlayerId;
  name: string;
  role: Role;
  roomId: RoomId;
  health: number;           // 0–3
  fear: number;             // 0–100
  heartbeat: HeartbeatState;
  status: PlayerStatus;
  captureCountdown: number; // rounds left before elimination when captured
  isHiding: boolean;
  isControlled: boolean;    // true = human-controlled
  noise: number;            // 0–3, reset each round
  movedThisRound: boolean;  // true if player used a move action this round
  stats: PlayerStats;
}

export interface PlayerStats {
  repairsContributed: number;
  rescuesPerformed: number;
  timesCapture: number;
  noiseMade: number;
  distracionsPerformed: number;
  healsPerformed: number;
}

export interface Room {
  id: RoomId;
  name: string;
  machineId: string | null;
  machineProgress: number;  // 0–100
  isLocked: boolean;
  isGate: boolean;
  isGateOpen: boolean;
  hasFootprints: boolean;
  hasTrap: boolean;
  dangerLevel: number;      // 0–3
  fogLevel: number;         // 0–3 (Hunter proximity clue)
  scratchMarks: boolean;
  noiseLevel: number;       // accumulated this round
}

export type HunterAction =
  | { type: "patrol"; roomId: RoomId; reason: string }
  | { type: "listen"; roomId: RoomId; reason: string }
  | { type: "chase"; targetPlayerId: PlayerId; reason: string }
  | { type: "trap"; roomId: RoomId; reason: string }
  | { type: "guard"; targetPlayerId: PlayerId; reason: string }
  | { type: "blockExit"; gateRoomId: RoomId; reason: string };

export type SurvivorAction =
  | { type: "move"; targetRoomId: RoomId }
  | { type: "repair" }
  | { type: "hide" }
  | { type: "scout" }
  | { type: "rescue"; targetPlayerId: PlayerId }
  | { type: "heal"; targetPlayerId: PlayerId }
  | { type: "distract" }
  | { type: "wait" };

export type ChaseChoice = "holdBreath" | "run" | "throwObject" | "callForHelp";

export type Screen =
  | "mainMenu"
  | "lobby"
  | "roleReveal"
  | "gameBoard"
  | "result"
  | "demo";

export type GamePhase =
  | "survivorsChoosing"
  | "hunterActing"
  | "resolving"
  | "showingEvent"
  | "chaseEncounter"
  | "gameOver";

export interface HunterState {
  roomId: RoomId;
  lastKnownTargetId: PlayerId | null;
  isAlerted: boolean;
  trappedRooms: RoomId[];
  blockedExits: RoomId[];
  memory: Array<{ roomId: RoomId; round: number }>;
}

export type EventSeverity = "info" | "warning" | "danger" | "success";

export interface GameEvent {
  type: string;
  title: string;
  description: string;
  icon: string;
  severity: EventSeverity;
}

export interface ChaseEncounter {
  playerId: PlayerId;
  hunterRoomId: RoomId;
  round: number;
}

export interface GameState {
  round: number;
  phase: GamePhase;
  players: Record<PlayerId, Player>;
  rooms: Record<RoomId, Room>;
  hunter: HunterState;
  machinesRepaired: number;
  totalCaptures: number;
  eliminations: number;
  events: GameEvent[];
  currentEvent: GameEvent | null;
  pendingChase: ChaseEncounter | null;
  survivorActions: Partial<Record<PlayerId, SurvivorAction>>;
  hunterAction: HunterAction | null;
  isDebugMode: boolean;
  // Which player the local client controls.
  // Future Discord: set from Discord user → player-slot assignment at session join.
  localPlayerId: PlayerId;
  winner: "survivors" | "hunter" | null;
  noiseMap: Record<RoomId, number>;
  roundHistory: Array<{ round: number; events: GameEvent[] }>;
}

export interface GameResult {
  winner: "survivors" | "hunter";
  rounds: number;
  mvpId: PlayerId | null;
  mostRecklessId: PlayerId | null;
  mostHelpfulId: PlayerId | null;
  hunterNote: string;
  escapedPlayers: PlayerId[];
}
