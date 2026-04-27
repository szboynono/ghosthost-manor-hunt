import type { GameState, RoomId, PlayerId } from "../game/types";
import { ALL_ROOM_IDS, ROOM_POSITIONS, ADJACENCY } from "../game/constants";
import RoomCell from "./RoomCell";
import styles from "./ManorMap.module.css";

interface Props {
  gameState: GameState;
  controlledPlayerId: PlayerId;
  selectedRoomId: RoomId | null;
  onRoomClick: (roomId: RoomId) => void;
  debugShowHunter: boolean;
}

export default function ManorMap({
  gameState, controlledPlayerId, selectedRoomId, onRoomClick, debugShowHunter,
}: Props) {
  const controlled = gameState.players[controlledPlayerId];
  const adjacentToPlayer = ADJACENCY[controlled.roomId];

  // Build grid (3 cols × 3 rows)
  const grid: (RoomId | null)[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
  for (const id of ALL_ROOM_IDS) {
    const [col, row] = ROOM_POSITIONS[id];
    grid[row][col] = id;
  }

  return (
    <div className={styles.grid}>
      {grid.flat().map((roomId, idx) => {
        if (!roomId) return <div key={idx} className={styles.empty} />;

        const room = gameState.rooms[roomId];
        const playersHere = Object.values(gameState.players).filter(
          (p) => p.roomId === roomId && p.status !== "escaped",
        );
        const isHunterHere = debugShowHunter && gameState.hunter.roomId === roomId;

        // Show fog/danger clues in adjacent rooms to hunter
        const hunterAdj = ADJACENCY[gameState.hunter.roomId];
        const showHunterClue = hunterAdj.includes(roomId) || gameState.hunter.roomId === roomId;

        const isReachable = adjacentToPlayer.includes(roomId);
        const isSelected = selectedRoomId === roomId;

        return (
          <div
            key={roomId}
            className={[
              styles.cellWrapper,
              isReachable ? styles.reachable : "",
            ].join(" ")}
          >
            <RoomCell
              room={room}
              players={playersHere}
              isHunterHere={isHunterHere}
              showHunterClue={showHunterClue}
              isSelected={isSelected}
              onClick={() => onRoomClick(roomId)}
            />
          </div>
        );
      })}
    </div>
  );
}
