import type { GameEvent } from "../game/types";
import styles from "./EventCard.module.css";

interface Props {
  event: GameEvent;
  onDismiss: () => void;
}

const SEVERITY_CLASS: Record<string, string> = {
  info:    styles.info,
  warning: styles.warning,
  danger:  styles.danger,
  success: styles.success,
};

export default function EventCard({ event, onDismiss }: Props) {
  return (
    <div className={styles.backdrop} onClick={onDismiss}>
      <div
        className={[styles.card, SEVERITY_CLASS[event.severity] ?? ""].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.icon}>{event.icon}</div>
        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.desc}>{event.description}</p>
        <button className={`btn btn-ghost ${styles.dismiss}`} onClick={onDismiss}>
          Continue →
        </button>
      </div>
    </div>
  );
}
