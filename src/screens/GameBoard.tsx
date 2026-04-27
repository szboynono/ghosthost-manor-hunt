import { useState } from "react";
import { useGame } from "../context/GameContext";
import type { RoomId, SurvivorAction } from "../game/types";
import StatusBar from "../components/StatusBar";
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

  const handleRoomClick = (roomId: RoomId) => {
    setSelectedRoom((prev) => (prev === roomId ? null : roomId));
  };

  const handleAction = (action: SurvivorAction) => {
    submitAction(controlled.id, action);
    setSelectedRoom(null);
  };

  return (
    <div className={styles.root}>
      <StatusBar
        gameState={gameState}
        controlledId={controlled.id}
        onToggleDebug={toggleDebug}
        onToggleMute={toggleMute}
        muted={muted}
      />

      <div className={styles.mapArea}>
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

      {/* Overlays */}
      {gameState.phase === "showingEvent" && gameState.currentEvent && (
        <EventCard event={gameState.currentEvent} onDismiss={dismissEvent} />
      )}

      {gameState.phase === "chaseEncounter" && gameState.pendingChase && (
        <ChaseModal gameState={gameState} onChoice={resolveChase} />
      )}

      {/* Debug panel */}
      {gameState.isDebugMode && (
        <div className={styles.debugBadge}>
          🛠 DEBUG · Hunter: {gameState.hunter.roomId} · Round: {gameState.round}
        </div>
      )}
    </div>
  );
}
