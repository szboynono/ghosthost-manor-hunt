import { useGame } from "../context/GameContext";
import { useDiscordContext } from "../discord/DiscordContext";
import type { DiscordStatus } from "../discord/discordSdk";
import styles from "./MainMenu.module.css";

const STATUS_LABEL: Record<DiscordStatus, string> = {
  local:        "Local Mode",
  initializing: "Discord...",
  ready:        "Discord",
  error:        "Discord Error",
};

const STATUS_COLOR: Record<DiscordStatus, string> = {
  local:        "var(--text-dim)",
  initializing: "#f39c12",
  ready:        "#2ecc71",
  error:        "#e74c3c",
};

export default function MainMenu() {
  const { goTo } = useGame();
  const { status, participantCount } = useDiscordContext();

  return (
    <div className={styles.root}>
      <div className={styles.bg} aria-hidden />

      <div className={styles.hero}>
        <div className={styles.ghostIcon}>👻</div>
        <h1 className={styles.title}>GhostHost</h1>
        <h2 className={styles.subtitle}>Manor Hunt</h2>
        <p className={styles.tagline}>4 Survivors. 1 AI Hunter. Escape the manor.</p>
      </div>

      <div className={styles.actions}>
        <button
          className="btn btn-primary"
          style={{ width: "100%", fontSize: 18 }}
          onClick={() => goTo("lobby")}
        >
          🔦 Start Hunt
        </button>
        <button
          className="btn btn-ghost"
          style={{ width: "100%" }}
          onClick={() => goTo("demo")}
        >
          👁 Watch a Game
        </button>
        <button
          className="btn btn-ghost"
          style={{ width: "100%" }}
          onClick={() => goTo("lobby")}
        >
          📖 How to Play
        </button>
      </div>

      <div className={styles.howTo} id="howto">
        <h3>Objective</h3>
        <p>Repair 5 generators and escape through a gate before The Warden captures 3 survivors.</p>
        <ul>
          <li>🔧 <b>Repair</b> — Fix generators in rooms</li>
          <li>🏃 <b>Move</b> — Travel to adjacent rooms</li>
          <li>🫁 <b>Hide</b> — Avoid detection</li>
          <li>🔭 <b>Scout</b> — Reveal danger clues</li>
          <li>🩺 <b>Rescue/Heal</b> — Save teammates</li>
          <li>📢 <b>Distract</b> (Decoy only) — Draw Hunter away</li>
        </ul>
      </div>

      <footer className={styles.footer}>
        <span>GhostHost v0.1</span>
        <span className={styles.footerStatus} style={{ color: STATUS_COLOR[status] }}>
          {STATUS_LABEL[status]}
          {status === "ready" && participantCount > 0 && (
            <> &middot; {participantCount} player{participantCount !== 1 ? "s" : ""}</>
          )}
        </span>
      </footer>
    </div>
  );
}
