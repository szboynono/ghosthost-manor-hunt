import type { GameState, PlayerId } from "../game/types";
import { PLAYER_COLORS } from "../game/constants";
import styles from "./StatusBar.module.css";

const HEARTBEAT_ICONS: Record<string, string> = {
  calm:      "💚",
  uneasy:    "💛",
  racing:    "🟠",
  panicking: "❤️",
};

const HB_LABELS: Record<string, string> = {
  calm: "CALM", uneasy: "UNEASY", racing: "RACING", panicking: "PANIC",
};

const HB_PULSE: Record<string, string> = {
  calm:      "",
  uneasy:    "pulseUneasy",
  racing:    "pulseRacing",
  panicking: "pulsePanicking",
};

interface Props {
  gameState: GameState;
  controlledId: PlayerId;
  onToggleDebug: () => void;
  onToggleMute: () => void;
  muted: boolean;
}

export default function StatusBar({ gameState, controlledId, onToggleDebug, onToggleMute, muted }: Props) {
  const player = gameState.players[controlledId];
  const colorIdx = ["p1","p2","p3","p4"].indexOf(controlledId);
  const color = PLAYER_COLORS[colorIdx] ?? "#888";

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.roundBadge}>R{gameState.round}</div>
        <div className={styles.machines}>
          <span>⚙️</span>
          <span className={styles.machineCount}>{gameState.machinesRepaired}/5</span>
        </div>
        <div className={styles.captures}>
          <span>🔒</span>
          <span
            className={styles.captureCount}
            style={{ color: gameState.eliminations >= 2 ? "var(--red)" : undefined }}
          >
            {gameState.eliminations}/3
          </span>
        </div>
      </div>

      <div className={styles.center}>
        <div
          className={[
            styles.heartbeat,
            HB_PULSE[player.heartbeat] ? styles[HB_PULSE[player.heartbeat] as keyof typeof styles] : "",
          ].filter(Boolean).join(" ")}
        >
          {HEARTBEAT_ICONS[player.heartbeat]}
          <span style={{ color }}>{HB_LABELS[player.heartbeat]}</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={[styles.fearBar, player.fear >= 75 ? styles.fearBarGlow : ""].join(" ")}>
          <div className={styles.fearFill} style={{ width: `${player.fear}%` }} />
        </div>
        <div className={styles.controls}>
          {gameState.isDebugMode && (
            <button className={styles.iconBtn} onClick={onToggleDebug} title="Debug mode">🛠</button>
          )}
          <button className={styles.iconBtn} onClick={onToggleMute} title={muted ? "Unmute" : "Mute"}>
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>
    </div>
  );
}
