import { useState, useEffect } from "react";
import { isDiscordMode, initDiscord, type DiscordStatus } from "./discordSdk";

export function useDiscordActivity(): { status: DiscordStatus } {
  const [status, setStatus] = useState<DiscordStatus>(
    isDiscordMode ? "initializing" : "local",
  );

  useEffect(() => {
    if (!isDiscordMode) return;
    let active = true;
    initDiscord().then((s) => {
      if (active) setStatus(s);
    });
    return () => { active = false; };
  }, []);

  return { status };
}
