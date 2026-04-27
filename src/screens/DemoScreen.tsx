import { useState, useEffect, useRef, useCallback } from "react";
import { useGame } from "../context/GameContext";
import type { GameState } from "../game/types";
import { buildDemoStates, DEMO_MOMENT_LABELS } from "../game/demoRunner";
import { computeResult } from "../game/scoring";
import { PLAYER_COLORS } from "../game/constants";
import StatusBar from "../components/StatusBar";
import ObjectivesBar from "../components/ObjectivesBar";
import ManorMap from "../components/ManorMap";
import EventCard from "./EventCard";
import ChaseModal from "./ChaseModal";
import styles from "./DemoScreen.module.css";

const DELAY_NORMAL = 4000;
const DELAY_SLOW   = 8000; // events + chase — viewer needs time to read/watch

export default function DemoScreen() {
  const { goTo } = useGame();
  const [states]          = useState<GameState[]>(() => buildDemoStates());
  const [idx, setIdx]     = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = states[idx];
  const isLast  = idx === states.length - 1;

  const advance = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIdx(i => Math.min(i + 1, states.length - 1));
  }, [states.length]);

  const restart = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIdx(0);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing || isLast) return;
    const slowState =
      (current.phase === "showingEvent" && !!current.currentEvent) ||
      current.phase === "chaseEncounter";
    const delay = slowState ? DELAY_SLOW : DELAY_NORMAL;
    timerRef.current = setTimeout(() => {
      setIdx(i => Math.min(i + 1, states.length - 1));
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, idx, isLast, current, states.length]);

  if (!current) return null;
  const controlled = Object.values(current.players).find(p => p.isControlled);
  if (!controlled) return null;

  const label  = DEMO_MOMENT_LABELS[idx] ?? "";
  const result = isLast ? computeResult(current) : null;

  const playerName = (id: string | null) =>
    id ? current.players[id as keyof typeof current.players]?.name ?? "—" : "—";

  const playerColorIdx = (id: string | null): number => {
    if (!id) return 0;
    return ["p1", "p2", "p3", "p4"].indexOf(id);
  };

  return (
    <div className={styles.root}>
      <div className={styles.demoBadge}>DEMO · WATCH MODE</div>

      <StatusBar
        gameState={current}
        controlledId={controlled.id}
        onToggleDebug={() => {}}
        onToggleMute={() => {}}
        muted={false}
      />

      <ObjectivesBar gameState={current} />

      <div className={styles.mapArea}>
        <ManorMap
          gameState={current}
          controlledPlayerId={controlled.id}
          selectedRoomId={null}
          onRoomClick={() => {}}
          debugShowHunter={true}
        />
        <div className={styles.momentLabel}>{label}</div>
      </div>

      <div className={styles.controls}>
        <button className={styles.ctrlBtn} onClick={restart}                  title="Restart Demo">↩</button>
        <button className={styles.ctrlBtn} onClick={() => setPlaying(p => !p)}>
          {playing ? "⏸" : "▶"}
        </button>
        <button className={styles.ctrlBtn} onClick={advance} disabled={isLast} title="Next Moment">›</button>
        <button className={styles.ctrlBtn} onClick={() => goTo("mainMenu")}   title="Exit Demo">✕</button>
      </div>

      <div className={styles.dots}>
        {states.map((_, i) => (
          <button
            key={i}
            className={[styles.dot, i === idx ? styles.dotActive : ""].join(" ")}
            onClick={() => setIdx(i)}
            aria-label={`Moment ${i + 1}`}
          />
        ))}
      </div>

      {/* Event card overlay */}
      {current.phase === "showingEvent" && current.currentEvent && !isLast && (
        <EventCard event={current.currentEvent} onDismiss={advance} />
      )}

      {/* Chase encounter overlay — any choice or auto-advance continues the demo */}
      {current.phase === "chaseEncounter" && current.pendingChase && !isLast && (
        <ChaseModal gameState={current} onChoice={() => advance()} />
      )}

      {/* Recap card — replaces plain end overlay */}
      {isLast && result && (
        <div className={styles.recapOverlay}>
          <div className={styles.recapCard}>

            <div className={[styles.recapBanner, result.winner === "survivors" ? styles.recapBannerWin : styles.recapBannerLose].join(" ")}>
              <div className={styles.recapBannerIcon}>
                {result.winner === "survivors" ? "🚪" : "👁"}
              </div>
              <h2 className={[styles.recapBannerTitle, result.winner === "survivors" ? styles.recapWin : styles.recapLose].join(" ")}>
                {result.winner === "survivors" ? "Survivors Escaped!" : "The Warden Wins"}
              </h2>
              <p className={styles.recapBannerSub}>
                Round {result.rounds} · {current.machinesRepaired}/5 generators
              </p>
            </div>

            <div className={styles.recapStatsRow}>
              {[
                { val: `${current.machinesRepaired}/5`, label: "Generators" },
                { val: String(result.rounds),           label: "Rounds"     },
                { val: `${current.eliminations}/3`,     label: "Lost"       },
                { val: String(result.escapedPlayers.length), label: "Escaped" },
              ].map(s => (
                <div key={s.label} className={styles.recapStatCell}>
                  <span className={styles.recapStatVal}>{s.val}</span>
                  <span className={styles.recapStatLabel}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.recapSection}>
              <div className={styles.recapSectionTitle}>Match Report</div>
              <div className={styles.recapAwards}>
                {[
                  { icon: "🏆", label: "MVP",           id: result.mvpId },
                  { icon: "🔥", label: "Most Reckless",  id: result.mostRecklessId },
                  { icon: "🤝", label: "Most Helpful",   id: result.mostHelpfulId },
                ].map(a => {
                  const ci = playerColorIdx(a.id);
                  const color = ci >= 0 ? PLAYER_COLORS[ci] : undefined;
                  return (
                    <div key={a.label} className={styles.recapAwardRow}>
                      <span className={styles.recapAwardIcon}>{a.icon}</span>
                      <span className={styles.recapAwardLabel}>{a.label}</span>
                      <span className={styles.recapAwardName} style={{ color }}>{playerName(a.id)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.recapHunterNote}>
              <span className={styles.recapHunterIcon}>👁</span>
              <p className={styles.recapHunterText}>{result.hunterNote}</p>
            </div>

            <div className={styles.recapActions}>
              <button className="btn btn-primary" onClick={restart}>↩ Watch Again</button>
              <button className="btn btn-ghost"   onClick={() => goTo("lobby")}>🔦 Start Hunt</button>
              <button className="btn btn-ghost"   onClick={() => goTo("mainMenu")}>🏠 Menu</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
