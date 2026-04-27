import type { GameState, PlayerId, ChaseChoice } from "../game/types";
import styles from "./ChaseModal.module.css";

interface Props {
  gameState: GameState;
  onChoice: (playerId: PlayerId, choice: ChaseChoice) => void;
}

const CHOICES: { id: ChaseChoice; icon: string; label: string; sub: string }[] = [
  { id: "holdBreath",  icon: "🫁", label: "Hold Breath",  sub: "Stay hidden, pray they pass" },
  { id: "run",         icon: "🏃", label: "Run",          sub: "Sprint to another room" },
  { id: "throwObject", icon: "🪨", label: "Throw Object", sub: "Distract, then slip away" },
  { id: "callForHelp", icon: "📣", label: "Call for Help", sub: "Alert teammates nearby" },
];

export default function ChaseModal({ gameState, onChoice }: Props) {
  const chase = gameState.pendingChase!;
  const player = gameState.players[chase.playerId];

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div className={styles.warden}>👁</div>
        <h3 className={styles.title}>THE WARDEN FOUND {player.name.toUpperCase()}!</h3>
        <p className={styles.sub}>Choose quickly. Every second counts.</p>

        <div className={styles.fearMeter}>
          <div className={styles.fearLabel}>FEAR</div>
          <div className={styles.fearBar}>
            <div className={styles.fearFill} style={{ width: `${player.fear}%` }} />
          </div>
          <div className={styles.fearValue}>{Math.round(player.fear)}%</div>
        </div>

        <div className={styles.choices}>
          {CHOICES.map((c) => (
            <button
              key={c.id}
              className={`btn btn-ghost ${styles.choiceBtn}`}
              onClick={() => onChoice(chase.playerId, c.id)}
            >
              <span className={styles.choiceIcon}>{c.icon}</span>
              <div className={styles.choiceText}>
                <span className={styles.choiceLabel}>{c.label}</span>
                <span className={styles.choiceSub}>{c.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
