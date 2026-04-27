import type { PlayerId } from "../game/types";

export interface DiscordParticipant {
  id: string;
  username: string;
  displayName: string;    // global_name ?? username
  avatarUrl: string | null;
}

// Shape shared by getInstanceConnectedParticipants and ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE
export interface RawDiscordParticipant {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar?: string | null;
  flags: number;
  bot: boolean;
}

export function mapRawToParticipant(raw: RawDiscordParticipant): DiscordParticipant {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.global_name ?? raw.username,
    avatarUrl: raw.avatar
      ? `https://cdn.discordapp.com/avatars/${raw.id}/${raw.avatar}.png?size=64`
      : null,
  };
}

const SLOT_ORDER: PlayerId[] = ["p1", "p2", "p3", "p4"];

/**
 * Maps up to 4 participants to player slots in join order.
 * Phase C: replace with server-assigned slots keyed by instanceId.
 */
export function mapParticipantsToSlots(
  participants: DiscordParticipant[],
): Partial<Record<PlayerId, DiscordParticipant>> {
  const result: Partial<Record<PlayerId, DiscordParticipant>> = {};
  participants.slice(0, 4).forEach((p, i) => {
    result[SLOT_ORDER[i]] = p;
  });
  return result;
}
