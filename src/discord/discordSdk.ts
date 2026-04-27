import { DiscordSDK } from "@discord/embedded-app-sdk";

export type DiscordStatus = "local" | "initializing" | "ready" | "error";

// Set VITE_DISCORD_CLIENT_ID in .env to enable Discord Activity mode.
// Absent → local browser mode, SDK is never instantiated.
const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;

export const isDiscordMode = Boolean(CLIENT_ID);

let _sdk: DiscordSDK | null = null;
let _initPromise: Promise<DiscordStatus> | null = null;

/** Returns the initialized DiscordSDK instance, or null in local mode. */
export function getDiscordSdk(): DiscordSDK | null {
  return _sdk;
}

/**
 * Initializes the Discord Embedded App SDK. Safe to call multiple times —
 * subsequent calls return the same promise.
 *
 * Future Discord (Phase B): after ready(), call
 *   sdk.commands.getInstanceConnectedParticipants()
 * and map discordUserId → localPlayerId.
 */
export function initDiscord(): Promise<DiscordStatus> {
  if (!isDiscordMode) return Promise.resolve<DiscordStatus>("local");
  if (_initPromise) return _initPromise;

  _initPromise = (async (): Promise<DiscordStatus> => {
    try {
      _sdk = new DiscordSDK(CLIENT_ID!);
      await _sdk.ready();
      return "ready";
    } catch {
      return "error";
    }
  })();

  return _initPromise;
}
