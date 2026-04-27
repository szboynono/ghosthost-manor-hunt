import {
  createContext, useContext, useState, useEffect, useRef, useCallback,
  type ReactNode,
} from "react";
import { useDiscordContext } from "../discord/DiscordContext";
import { SessionClient, type SessionConnectionStatus } from "./sessionClient";
import type { ServerMessage, LobbySlot } from "./sessionTypes";
import type { PlayerId } from "../game/types";

const SESSION_SERVER_URL = import.meta.env.VITE_SESSION_SERVER_URL as string | undefined;

function resolveInstanceId(discordId: string | null): string | null {
  if (discordId) return discordId;
  const param = new URLSearchParams(window.location.search).get("instanceId");
  if (param) return param;
  const env = import.meta.env.VITE_DEV_INSTANCE_ID as string | undefined;
  return env ?? null;
}

interface SessionCtx {
  connectionStatus: SessionConnectionStatus;
  myClientId: string | null;
  assignedPlayerId: PlayerId | null;
  isHost: boolean;
  lobbyState: LobbySlot[];
  huntSignal: number;
  setReady: (ready: boolean) => void;
  beginHunt: () => void;
}

const Ctx = createContext<SessionCtx | null>(null);

export function useSessionContext(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSessionContext must be inside SessionProvider");
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { instanceId: discordInstanceId, participants } = useDiscordContext();
  const instanceId = resolveInstanceId(discordInstanceId);

  const [connectionStatus, setConnectionStatus] = useState<SessionConnectionStatus>("disconnected");
  const [myClientId, setMyClientId]             = useState<string | null>(null);
  const [assignedPlayerId, setAssignedPlayerId] = useState<PlayerId | null>(null);
  const [isHost, setIsHost]                     = useState(false);
  const [lobbyState, setLobbyState]             = useState<LobbySlot[]>([]);
  const [huntSignal, setHuntSignal]             = useState(0);

  const clientRef      = useRef<SessionClient | null>(null);
  const clientIdRef    = useRef<string | null>(null);
  const hasJoinedRef   = useRef(false);
  const displayNameRef = useRef<string>("Player");
  const avatarUrlRef   = useRef<string | null>(null);

  // Keep display-name refs current without triggering effect re-runs
  displayNameRef.current = participants[0]?.displayName ?? "Player";
  avatarUrlRef.current   = participants[0]?.avatarUrl   ?? null;

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "welcome":
        clientIdRef.current = msg.clientId;
        setMyClientId(msg.clientId);
        setAssignedPlayerId(msg.assignedPlayerId);
        setIsHost(msg.isHost);
        break;
      case "lobbyUpdate":
        setLobbyState(msg.slots);
        if (clientIdRef.current !== null) {
          setIsHost(msg.hostClientId === clientIdRef.current);
        }
        break;
      case "huntStart":
        setHuntSignal(msg.signal);
        break;
    }
  }, []);

  // Create / destroy the WS client when instanceId or server URL changes
  useEffect(() => {
    if (!SESSION_SERVER_URL || !instanceId) return;

    hasJoinedRef.current = false;
    const client = new SessionClient(SESSION_SERVER_URL, handleMessage, setConnectionStatus);
    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current  = null;
      hasJoinedRef.current = false;
    };
  }, [instanceId, handleMessage]);

  // Send "join" once per connection (not on every displayName update)
  useEffect(() => {
    if (connectionStatus === "connected" && instanceId && clientRef.current && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      clientRef.current.send({
        type: "join",
        instanceId,
        displayName: displayNameRef.current,
        avatarUrl: avatarUrlRef.current,
      });
    }
    if (connectionStatus === "disconnected") {
      hasJoinedRef.current = false;
    }
  }, [connectionStatus, instanceId]);

  const setReady = useCallback((ready: boolean) => {
    clientRef.current?.send({ type: "ready", ready });
  }, []);

  const beginHunt = useCallback(() => {
    clientRef.current?.send({ type: "beginHunt" });
  }, []);

  const value: SessionCtx = {
    connectionStatus,
    myClientId,
    assignedPlayerId,
    isHost,
    lobbyState,
    huntSignal,
    setReady,
    beginHunt,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
