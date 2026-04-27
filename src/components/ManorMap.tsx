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

// Pre-compute corridors from ADJACENCY (each pair once)
const CORRIDORS: Array<{
  from: RoomId; to: RoomId;
  gridCol: number; gridRow: number;
  isH: boolean;
}> = (() => {
  const seen = new Set<string>();
  const list: typeof CORRIDORS = [];
  for (const roomA of ALL_ROOM_IDS) {
    for (const roomB of ADJACENCY[roomA]) {
      const key = [roomA, roomB].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const [colA, rowA] = ROOM_POSITIONS[roomA];
      const [colB, rowB] = ROOM_POSITIONS[roomB];
      // CSS grid is 1-indexed; rooms at odd positions (col*2+1, row*2+1)
      const cssColA = colA * 2 + 1;
      const cssRowA = rowA * 2 + 1;
      const cssColB = colB * 2 + 1;
      const cssRowB = rowB * 2 + 1;
      list.push({
        from: roomA, to: roomB,
        gridCol: (cssColA + cssColB) / 2,
        gridRow: (cssRowA + cssRowB) / 2,
        isH: rowA === rowB,
      });
    }
  }
  return list;
})();

export default function ManorMap({
  gameState, controlledPlayerId, selectedRoomId, onRoomClick, debugShowHunter,
}: Props) {
  const controlled = gameState.players[controlledPlayerId];
  const adjacentToPlayer = ADJACENCY[controlled.roomId];
  const hunterRoom = gameState.hunter.roomId;
  const hunterAdj = ADJACENCY[hunterRoom];

  return (
    <div className={styles.grid}>
      {/* Rooms */}
      {ALL_ROOM_IDS.map((roomId) => {
        const [col, row] = ROOM_POSITIONS[roomId];
        const room = gameState.rooms[roomId];
        const playersHere = Object.values(gameState.players).filter(
          (p) => p.roomId === roomId && p.status !== "escaped",
        );
        const isHunterHere = debugShowHunter && hunterRoom === roomId;
        const showHunterClue = hunterAdj.includes(roomId) || hunterRoom === roomId;
        const isReachable = adjacentToPlayer.includes(roomId);
        const isSelected = selectedRoomId === roomId;

        return (
          <div
            key={roomId}
            className={[
              styles.cellWrapper,
              isReachable ? styles.reachable : "",
            ].join(" ")}
            style={{ gridColumn: col * 2 + 1, gridRow: row * 2 + 1 }}
          >
            <RoomCell
              room={room}
              players={playersHere}
              isHunterHere={isHunterHere}
              showHunterClue={showHunterClue}
              isSelected={isSelected}
              isPlayerRoom={controlled.roomId === roomId}
              isReachable={isReachable}
              onClick={() => onRoomClick(roomId)}
            />
          </div>
        );
      })}

      {/* Corridors */}
      {CORRIDORS.map((c) => {
        const fromFog = gameState.rooms[c.from].fogLevel;
        const toFog = gameState.rooms[c.to].fogLevel;
        const maxFog = Math.max(fromFog, toFog);
        const isHunterCorridor = debugShowHunter &&
          (hunterRoom === c.from || hunterRoom === c.to);
        const isNearHunter = !isHunterCorridor && (
          hunterAdj.includes(c.from) || hunterAdj.includes(c.to)
        );

        let dangerClass = "";
        if (isHunterCorridor) dangerClass = styles.corridorHunter;
        else if (maxFog >= 2 || isNearHunter) dangerClass = styles.corridorDanger;
        else if (maxFog >= 1) dangerClass = styles.corridorWarm;

        return (
          <div
            key={`${c.from}|${c.to}`}
            className={[
              c.isH ? styles.corridorH : styles.corridorV,
              dangerClass,
            ].join(" ")}
            style={{ gridColumn: c.gridCol, gridRow: c.gridRow }}
          />
        );
      })}
    </div>
  );
}
