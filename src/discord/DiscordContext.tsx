import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { initDiscord, getDiscordSdk, isDiscordMode, type DiscordStatus } from "./discordSdk";
import {
  mapRawToParticipant, mapParticipantsToSlots,
  type DiscordParticipant, type RawDiscordParticipant,
} from "./discordParticipants";
import type { PlayerId } from "../game/types";

interface DiscordCtx {
  status: DiscordStatus;
  instanceId: string | null;
  participants: DiscordParticipant[];
  slotMap: Partial<Record<PlayerId, DiscordParticipant>>;
  // Phase B: always "p1" — local participant cannot be identified without OAuth.
  // Phase C: resolve via sdk.commands.authenticate() after server-side token exchange.
  mappedPlayerId: PlayerId;
  participantCount: number;
  refreshParticipants: () => Promise<void>;
  error: string | null;
}

const Ctx = createContext<DiscordCtx | null>(null);

export function useDiscordContext(): DiscordCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDiscordContext must be inside DiscordProvider");
  return ctx;
}

export function DiscordProvider({ children }: { children: ReactNode }) {
  const [status, setStatus]           = useState<DiscordStatus>(isDiscordMode ? "initializing" : "local");
  const [instanceId, setInstanceId]   = useState<string | null>(null);
  const [participants, setParticipants] = useState<DiscordParticipant[]>([]);
  const [error, setError]             = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    const sdk = getDiscordSdk();
    if (!sdk) return;
    try {
      const result = await sdk.commands.getInstanceConnectedParticipants();
      setParticipants(
        (result.participants as RawDiscordParticipant[]).map(mapRawToParticipant),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch participants");
    }
  }, []);

  useEffect(() => {
    if (!isDiscordMode) return;
    let active = true;
    initDiscord().then(async (s) => {
      if (!active) return;
      setStatus(s);
      if (s === "ready") {
        const sdk = getDiscordSdk();
        if (sdk) {
          setInstanceId(sdk.instanceId);
          await fetchParticipants();
        }
      }
    });
    return () => { active = false; };
  }, [fetchParticipants]);

  // Note: ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE subscription deferred to Phase C.
  // Use refreshParticipants() to manually re-fetch after lobby navigation.

  const slotMap = mapParticipantsToSlots(participants);

  const value: DiscordCtx = {
    status,
    instanceId,
    participants,
    slotMap,
    mappedPlayerId: "p1",
    participantCount: participants.length,
    refreshParticipants: fetchParticipants,
    error,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
