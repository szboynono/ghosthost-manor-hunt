import { useGame } from "../context/GameContext";
import { PLAYER_COLORS } from "../game/constants";
import styles from "./ResultScreen.module.css";

export default function ResultScreen() {
  const { result, gameState, goTo, startGame } = useGame();
  if (!result || !gameState) return null;

  const playerName = (id: string | null) =>
    id ? gameState.players[id as keyof typeof gameState.players]?.name ?? "—" : "—";

  const survivorsWon = result.winner === "survivors";

  return (
    <div className={styles.root}>
      <div className={[styles.banner, survivorsWon ? styles.win : styles.lose].join(" ")}>
        <div className={styles.bannerIcon}>{survivorsWon ? "🚪" : "👁"}</div>
        <h1 className={styles.bannerTitle}>
          {survivorsWon ? "Survivors Escaped!" : "The Warden Wins"}
        </h1>
        <p className={styles.bannerSub}>
          {survivorsWon
            ? `${result.escapedPlayers.length} survivor${result.escapedPlayers.length !== 1 ? "s" : ""} made it out in ${result.rounds} rounds`
            : `All hope lost after ${result.rounds} rounds`}
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCell}>
          <span className={styles.statVal}>{gameState.machinesRepaired}/5</span>
          <span className={styles.statLabel}>Generators</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statVal}>{result.rounds}</span>
          <span className={styles.statLabel}>Rounds</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statVal} style={{ color: gameState.eliminations >= 2 ? "var(--red)" : undefined }}>
            {gameState.eliminations}/3
          </span>
          <span className={styles.statLabel}>Lost</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statVal}>{result.escapedPlayers.length}</span>
          <span className={styles.statLabel}>Escaped</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Match Report</h3>
        <div className={styles.awards}>
          <div className={styles.awardRow}>
            <span className={styles.awardIcon}>🏆</span>
            <span className={styles.awardLabel}>MVP</span>
            <span className={styles.awardName}>{playerName(result.mvpId)}</span>
          </div>
          <div className={styles.awardRow}>
            <span className={styles.awardIcon}>🔥</span>
            <span className={styles.awardLabel}>Most Reckless</span>
            <span className={styles.awardName}>{playerName(result.mostRecklessId)}</span>
          </div>
          <div className={styles.awardRow}>
            <span className={styles.awardIcon}>🤝</span>
            <span className={styles.awardLabel}>Most Helpful</span>
            <span className={styles.awardName}>{playerName(result.mostHelpfulId)}</span>
          </div>
          {result.escapedPlayers.length > 0 && (
            <div className={styles.awardRow}>
              <span className={styles.awardIcon}>🚪</span>
              <span className={styles.awardLabel}>Escaped</span>
              <span className={styles.awardName}>
                {result.escapedPlayers.map(playerName).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.hunterNote}>
        <span className={styles.hunterNoteIcon}>👁</span>
        <p className={styles.hunterNoteText}>{result.hunterNote}</p>
      </div>

      <div className={styles.playerSummary}>
        {Object.values(gameState.players).map((p, i) => (
          <div key={p.id} className={styles.playerRow}>
            <div
              className={styles.pAvatar}
              style={{ background: PLAYER_COLORS[i] }}
            >
              {p.name[0]}
            </div>
            <div className={styles.pInfo}>
              <div className={styles.pName}>{p.name}</div>
              <div className={styles.pStatus} style={{ color: statusColor(p.status) }}>
                {p.status.toUpperCase()}
              </div>
            </div>
            <div className={styles.pStats}>
              <span title="Repairs">⚙️ {p.stats.repairsContributed}</span>
              <span title="Rescues">🩺 {p.stats.rescuesPerformed}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => startGame(false)}>
          🔄 Rematch
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => goTo("mainMenu")}>
          🏠 Menu
        </button>
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "escaped":    return "var(--green)";
    case "eliminated": return "var(--red)";
    case "captured":   return "var(--yellow)";
    case "injured":    return "var(--yellow)";
    default:           return "var(--text-dim)";
  }
}
