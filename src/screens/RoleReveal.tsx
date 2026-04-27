import { useGame } from "../context/GameContext";
import { ROLE_DESCRIPTIONS, PLAYER_COLORS } from "../game/constants";
import styles from "./RoleReveal.module.css";

const ROLE_ICONS: Record<string, string> = {
  mechanic: "🔧",
  medic: "🩺",
  scout: "🔭",
  decoy: "📢",
};

export default function RoleReveal() {
  const { gameState, goTo } = useGame();
  if (!gameState) return null;

  const controlled = Object.values(gameState.players).find((p) => p.isControlled)!;
  const desc = ROLE_DESCRIPTIONS[controlled.role];
  const color = PLAYER_COLORS[["p1","p2","p3","p4"].indexOf(controlled.id)];

  return (
    <div className={styles.root}>
      <div className={styles.overlay} style={{ background: `${color}18` }} />

      <div className={styles.label}>YOUR ROLE</div>

      <div className={styles.card} style={{ borderColor: color }}>
        <div className={styles.icon} style={{ color }}>{ROLE_ICONS[controlled.role]}</div>
        <h2 className={styles.roleName} style={{ color }}>{desc.title}</h2>
        <div
          className={styles.avatar}
          style={{ background: color, boxShadow: `0 0 24px ${color}66` }}
        >
          {controlled.name[0]}
        </div>
        <p className={styles.playerName}>{controlled.name}</p>

        <div className={styles.abilityRow}>
          <span className={styles.abilityLabel}>ABILITY</span>
          <span className={styles.abilityText}>{desc.ability}</span>
        </div>

        <p className={styles.goal}>{desc.goal}</p>
      </div>

      <div className={styles.teamPreview}>
        {Object.values(gameState.players)
          .filter((p) => !p.isControlled)
          .map((p, i) => (
            <div key={p.id} className={styles.teamMate}>
              <div
                className={styles.teamAvatar}
                style={{ background: PLAYER_COLORS[i + 1] }}
              >
                {ROLE_ICONS[p.role]}
              </div>
              <span className={styles.teamName}>{p.name}</span>
            </div>
          ))}
      </div>

      <button
        className="btn btn-primary"
        style={{ width: "calc(100% - 40px)", fontSize: 18, margin: "0 20px 24px" }}
        onClick={() => goTo("gameBoard")}
      >
        Enter the Manor →
      </button>
    </div>
  );
}
