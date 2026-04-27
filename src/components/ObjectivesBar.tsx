import type { GameState } from "../game/types";
import { GATE_ROOMS } from "../game/constants";
import styles from "./ObjectivesBar.module.css";

interface Props { gameState: GameState }

const TOTAL = 5;

export default function ObjectivesBar({ gameState }: Props) {
  const done = gameState.machinesRepaired;
  const allFixed = done >= TOTAL;
  const anyGateOpen = GATE_ROOMS.some(g => gameState.rooms[g].isGateOpen);

  return (
    <div className={[styles.bar, allFixed ? styles.ready : ""].join(" ")}>
      {/* Left: machines */}
      <div className={styles.side}>
        <span className={styles.icon}>⚙</span>
        <div className={styles.dots}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className={[styles.dot, i < done ? styles.dotDone : ""].join(" ")} />
          ))}
        </div>
        <span className={[styles.label, done > 0 ? styles.labelActive : ""].join(" ")}>
          {done}/{TOTAL} GENERATORS
        </span>
      </div>

      {/* Arrow */}
      <div className={[styles.arrow, allFixed ? styles.arrowActive : ""].join(" ")}>→</div>

      {/* Right: escape */}
      <div className={[styles.side, allFixed ? styles.escapeReady : styles.escapeLocked].join(" ")}>
        <span className={styles.icon}>🚪</span>
        <span className={styles.label}>
          {anyGateOpen
            ? "RUN TO GATE!"
            : allFixed
            ? "ESCAPE READY"
            : "LOCKED GATE"}
        </span>
        {anyGateOpen && <span className={styles.pulse}>▲</span>}
      </div>
    </div>
  );
}
