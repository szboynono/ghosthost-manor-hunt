import type { PlayerId } from "../game/types";

// Client → Server
export type ClientMessage =
  | { type: "join"; instanceId: string; displayName: string; avatarUrl: string | null }
  | { type: "ready"; ready: boolean }
  | { type: "beginHunt" };

// Server → Client
export type ServerMessage =
  | { type: "welcome"; clientId: string; assignedPlayerId: PlayerId | null; isHost: boolean }
  | { type: "lobbyUpdate"; slots: LobbySlot[]; hostClientId: string | null }
  | { type: "huntStart"; signal: number }
  | { type: "error"; message: string };

export interface LobbySlot {
  playerId: PlayerId;
  clientId: string;
  displayName: string;
  avatarUrl: string | null;
  ready: boolean;
}
