import { useState } from "react";
import { useGame } from "../context/GameContext";
import type { RoomId, SurvivorAction } from "../game/types";
import { ADJACENCY } from "../game/constants";
import StatusBar from "../components/StatusBar";
import ObjectivesBar from "../components/ObjectivesBar";
import ManorMap from "../components/ManorMap";
import ActionPanel from "../components/ActionPanel";
import EventCard from "./EventCard";
import ChaseModal from "./ChaseModal";
import styles from "./GameBoard.module.css";

export default function GameBoard() {
  const { gameState, submitAction, resolveChase, dismissEvent, toggleMute, toggleDebug, muted } = useGame();
  const [selectedRoom, setSelectedRoom] = useState<RoomId | null>(null);

  if (!gameState) return null;

  const controlled = Object.values(gameState.players).find((p) => p.isControlled);
  if (!controlled) return null;

  const hunterAdj = ADJACENCY[gameState.hunter.roomId];
  const hunterDist =
    gameState.hunter.roomId === controlled.roomId ? 2
    : hunterAdj.includes(controlled.roomId) ? 1
    : 0;

  const handleRoomClick = (roomId: RoomId) => {
    setSelectedRoom((prev) => (prev === roomId ? null : roomId));
  };

  const handleAction = (action: SurvivorAction) => {
    submitAction(controlled.id, action);
    setSelectedRoom(null);
  };

  const phase = gameState.phase;
  const isHunterPhase = phase === "hunterActing" || phase === "resolving";

  return (
    <div className={styles.root}>
      <StatusBar
        gameState={gameState}
        controlledId={controlled.id}
        onToggleDebug={toggleDebug}
        onToggleMute={toggleMute}
        muted={muted}
      />

      <ObjectivesBar gameState={gameState} />

      {/* Phase banner */}
      {isHunterPhase && (
        <div className={[styles.phaseBanner, phase === "hunterActing" ? styles.phaseDanger : styles.phaseResolve].join(" ")}>
          {phase === "hunterActing" ? "👁  THE WARDEN IS HUNTING..." : "⚙  RESOLVING ROUND..."}
        </div>
      )}

      <div className={styles.mapArea}>
        {/* Danger vignette */}
        {hunterDist > 0 && (
          <div className={[styles.vignette, hunterDist >= 2 ? styles.vignetteHigh : ""].join(" ")} />
        )}

        <ManorMap
          gameState={gameState}
          controlledPlayerId={controlled.id}
          selectedRoomId={selectedRoom}
          onRoomClick={handleRoomClick}
          debugShowHunter={gameState.isDebugMode}
        />
      </div>

      <ActionPanel
        gameState={gameState}
        controlledId={controlled.id}
        selectedRoomId={selectedRoom}
        onAction={handleAction}
      />

      {gameState.phase === "showingEvent" && gameState.currentEvent && (
        <EventCard event={gameState.currentEvent} onDismiss={dismissEvent} />
      )}

      {gameState.phase === "chaseEncounter" && gameState.pendingChase && (
        <ChaseModal gameState={gameState} onChoice={resolveChase} />
      )}

      {gameState.isDebugMode && (
        <div className={styles.debugBadge}>
          🛠 Hunter: {gameState.hunter.roomId} · R{gameState.round}
        </div>
      )}
    </div>
  );
}
