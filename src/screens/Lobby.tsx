import { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { useDiscordContext } from "../discord/DiscordContext";
import { useSessionContext } from "../session/SessionContext";
import { PLAYER_COLORS, ROLE_DESCRIPTIONS } from "../game/constants";
import type { Role, PlayerId } from "../game/types";
import styles from "./Lobby.module.css";

const ROLES: Role[] = ["mechanic", "medic", "scout", "decoy"];
const PLAYER_IDS: PlayerId[] = ["p1", "p2", "p3", "p4"];
const FALLBACK_NAMES = ["Alex", "Blake", "Casey", "Dana"] as const;
const ROLE_ICONS: Record<Role, string> = {
  mechanic: "🔧",
  medic: "🩺",
  scout: "🔭",
  decoy: "📢",
};

export default function Lobby() {
  const { goTo, startGame } = useGame();
  const { slotMap, mappedPlayerId } = useDiscordContext();
  const { connectionStatus, myClientId, assignedPlayerId, isHost, lobbyState, huntSignal, setReady, beginHunt } =
    useSessionContext();

  const sessionActive = connectionStatus === "connected";

  // huntSignal counter → trigger startGame on all connected clients
  const prevSignalRef = useRef(0);
  useEffect(() => {
    if (huntSignal > 0 && huntSignal !== prevSignalRef.current) {
      prevSignalRef.current = huntSignal;
      const playerId = assignedPlayerId ?? mappedPlayerId;
      startGame(false, playerId);
    }
  }, [huntSignal, assignedPlayerId, mappedPlayerId, startGame]);

  const mySlot = sessionActive ? lobbyState.find(s => s.clientId === myClientId) : null;
  const myReadyState = mySlot?.ready ?? false;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className="btn btn-ghost" style={{ padding: "8px 14px" }} onClick={() => goTo("mainMenu")}>
          ← Back
        </button>
        <span className={styles.headerTitle}>Manor Hunt</span>
        <div style={{ width: 60 }} />
      </header>

      <div className={styles.mapCard}>
        <span className={styles.mapIcon}>🏚</span>
        <div>
          <div className={styles.mapName}>Haunted Manor</div>
          <div className={styles.mapSub}>9 rooms · 5 generators · 2 gates</div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Survivors
          {sessionActive && <span className={styles.connectionBadge}>● Connected</span>}
        </h3>
        <div className={styles.players}>
          {ROLES.map((role, i) => {
            const slotId = PLAYER_IDS[i];

            // Session data takes priority; fall back to Discord then local fallbacks
            const sessionSlot = sessionActive ? lobbyState.find(s => s.playerId === slotId) : null;
            const discord = sessionActive ? null : slotMap[slotId];

            const name = sessionSlot?.displayName ?? discord?.displayName ?? FALLBACK_NAMES[i];
            const avatarUrl = sessionSlot?.avatarUrl ?? discord?.avatarUrl ?? null;
            const isYou = sessionActive ? sessionSlot?.clientId === myClientId : slotId === mappedPlayerId;
            const isReady = sessionSlot?.ready ?? false;

            return (
              <div key={role} className={styles.playerSlot}>
                <div
                  className={styles.avatar}
                  style={{ background: PLAYER_COLORS[i], boxShadow: `0 0 12px ${PLAYER_COLORS[i]}44` }}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt={name} className={styles.avatarImg} />
                    : ROLE_ICONS[role]}
                </div>
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>
                    {name}
                    {isYou && <span className={styles.youBadge}>YOU</span>}
                    {isReady && <span className={styles.readyBadge}>READY</span>}
                  </div>
                  <div className={styles.playerRole}>{ROLE_DESCRIPTIONS[role].title}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.hunterCard}>
        <div className={styles.hunterIcon}>👁</div>
        <div className={styles.hunterInfo}>
          <div className={styles.hunterName}>The Warden</div>
          <div className={styles.hunterSub}>AI Hunter · Heuristic Mode</div>
        </div>
        <div className={styles.hunterThreat}>THREAT</div>
      </div>

      <div className={styles.actions}>
        {sessionActive ? (
          isHost ? (
            <button
              className="btn btn-primary"
              style={{ width: "100%", fontSize: 18 }}
              onClick={beginHunt}
            >
              ⚡ Begin Hunt
            </button>
          ) : (
            <button
              className={myReadyState ? "btn btn-primary" : "btn btn-ghost"}
              style={{ width: "100%", fontSize: 18 }}
              onClick={() => setReady(!myReadyState)}
            >
              {myReadyState ? "✓ Ready" : "○ Ready Up"}
            </button>
          )
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: "100%", fontSize: 18 }}
            onClick={() => startGame(false, mappedPlayerId)}
          >
            ⚡ Begin Hunt
          </button>
        )}
        <button
          className="btn btn-ghost"
          style={{ width: "100%", fontSize: 14 }}
          onClick={() => startGame(true)}
        >
          🛠 Debug Mode (control all)
        </button>
      </div>
    </div>
  );
}
