import type { GameState, SurvivorAction, PlayerId, RoomId } from "../game/types";
import { getAvailableActions } from "../game/engine";
import { ROOM_NAMES } from "../game/constants";
import styles from "./ActionPanel.module.css";

interface Props {
  gameState: GameState;
  controlledId: PlayerId;
  selectedRoomId: RoomId | null;
  onAction: (action: SurvivorAction) => void;
}

const ACTION_META: Record<string, { label: string; icon: string; className: string; desc: string; noise: number }> = {
  move:     { label: "Move",     icon: "🏃", className: "btn-ghost",   desc: "Travel to adjacent room",           noise: 1 },
  repair:   { label: "Repair",   icon: "🔧", className: "btn-primary", desc: "Fix the generator — makes noise",   noise: 1 },
  hide:     { label: "Hide",     icon: "🫁", className: "btn-ghost",   desc: "Stay still, calm fear",             noise: 0 },
  scout:    { label: "Scout",    icon: "🔭", className: "btn-ghost",   desc: "Reveal Hunter if 1 room away",      noise: 1 },
  rescue:   { label: "Rescue",   icon: "🩺", className: "btn-success", desc: "Free a captured teammate",          noise: 2 },
  heal:     { label: "Heal",     icon: "💊", className: "btn-success", desc: "Restore injured survivor",          noise: 0 },
  distract: { label: "Distract", icon: "📢", className: "btn-danger",  desc: "Lure the Warden away — risky",     noise: 3 },
  wait:     { label: "Wait",     icon: "⏳", className: "btn-ghost",   desc: "Catch breath, reduce fear −5",      noise: 0 },
};

const NOISE_ICONS = ["", "🔉", "🔊", "📢"] as const;

export default function ActionPanel({ gameState, controlledId, selectedRoomId, onAction }: Props) {
  const available = getAvailableActions(gameState, controlledId);

  // Deduplicate: keep only one "move" entry per target room
  // Build action list, promoting selected room's Move to top
  const actionButtons: { action: SurvivorAction; label: string; icon: string; cls: string; desc: string; noise: number }[] = [];

  const seenTypes = new Set<string>();
  for (const a of available) {
    const meta = ACTION_META[a.type];
    if (!meta) continue;

    if (a.type === "move") {
      if (a.targetRoomId !== selectedRoomId) continue; // only show move for selected room
      actionButtons.push({
        action: a,
        label: `Move → ${ROOM_NAMES[a.targetRoomId]}`,
        icon: meta.icon,
        cls: meta.className,
        desc: meta.desc,
        noise: meta.noise,
      });
    } else if (a.type === "rescue") {
      const target = gameState.players[a.targetPlayerId];
      actionButtons.push({
        action: a,
        label: `Rescue ${target.name}`,
        icon: meta.icon,
        cls: meta.className,
        desc: meta.desc,
        noise: meta.noise,
      });
    } else if (a.type === "heal") {
      const target = gameState.players[a.targetPlayerId];
      actionButtons.push({
        action: a,
        label: `Heal ${target.name}`,
        icon: meta.icon,
        cls: meta.className,
        desc: meta.desc,
        noise: meta.noise,
      });
    } else if (!seenTypes.has(a.type)) {
      seenTypes.add(a.type);
      actionButtons.push({ action: a, label: meta.label, icon: meta.icon, cls: meta.className, desc: meta.desc, noise: meta.noise });
    }
  }

  const isSubmitted = !!gameState.survivorActions[controlledId];
  const isWaiting = gameState.phase !== "survivorsChoosing";

  return (
    <div className={styles.panel}>
      <div className={styles.hint}>
        {selectedRoomId
          ? `Selected: ${ROOM_NAMES[selectedRoomId]}`
          : "Tap a room to select it, then choose an action"}
      </div>

      {isSubmitted ? (
        <div className={styles.waiting}>
          <span>⏳</span> Waiting for Hunter...
        </div>
      ) : isWaiting ? (
        <div className={styles.waiting}>Processing round...</div>
      ) : (
        <div className={styles.actions}>
          {actionButtons.map((btn, i) => (
            <button
              key={i}
              className={`btn ${btn.cls} ${styles.actionBtn}`}
              onClick={() => onAction(btn.action)}
            >
              <div className={styles.actionBtnContent}>
                <div className={styles.actionBtnTop}>
                  <span>{btn.icon}</span>
                  <span>{btn.label}</span>
                  {btn.noise > 0 && (
                    <span className={styles.noiseBadge} title={`Noise ${btn.noise}`}>
                      {NOISE_ICONS[btn.noise]}
                    </span>
                  )}
                </div>
                <div className={styles.actionBtnDesc}>{btn.desc}</div>
              </div>
            </button>
          ))}
          {actionButtons.length === 0 && (
            <div className={styles.noActions}>No actions available</div>
          )}
        </div>
      )}
    </div>
  );
}
