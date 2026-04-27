import { useRef, useState, useEffect } from "react";
import type { Room, Player } from "../game/types";
import { PLAYER_COLORS } from "../game/constants";
import styles from "./RoomCell.module.css";

interface Props {
  room: Room;
  players: Player[];
  isHunterHere: boolean;    // true only if debug mode
  showHunterClue: boolean;  // fog/danger visible
  isSelected: boolean;
  onClick?: () => void;
}

const PLAYER_IDS = ["p1","p2","p3","p4"] as const;

export default function RoomCell({
  room, players, isHunterHere, showHunterClue, isSelected, onClick
}: Props) {
  const isDangerous = room.fogLevel >= 2 || (showHunterClue && room.fogLevel > 0);
  const machinePercent = room.machineId ? Math.round(room.machineProgress) : null;

  // Flash when machine reaches 100%
  const prevMachinePercent = useRef<number | null>(machinePercent);
  const [repairFlash, setRepairFlash] = useState(false);
  useEffect(() => {
    const prev = prevMachinePercent.current;
    if (machinePercent === 100 && prev !== null && prev < 100) {
      setRepairFlash(true);
      const t = setTimeout(() => setRepairFlash(false), 750);
      prevMachinePercent.current = machinePercent;
      return () => clearTimeout(t);
    }
    prevMachinePercent.current = machinePercent;
  }, [machinePercent]);

  // Flash when gate opens
  const prevGateOpen = useRef(room.isGateOpen);
  const [gateFlash, setGateFlash] = useState(false);
  useEffect(() => {
    if (room.isGateOpen && !prevGateOpen.current) {
      setGateFlash(true);
      const t = setTimeout(() => setGateFlash(false), 900);
      prevGateOpen.current = room.isGateOpen;
      return () => clearTimeout(t);
    }
    prevGateOpen.current = room.isGateOpen;
  }, [room.isGateOpen]);

  // Shake animation when a player is newly captured
  const prevStatuses = useRef<Record<string, string>>({});
  const [shakingIds, setShakingIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const prev = prevStatuses.current;
    const fresh = new Set<string>();
    for (const p of players) {
      if (p.status === "captured" && prev[p.id] !== "captured") fresh.add(p.id);
    }
    const next: Record<string, string> = {};
    for (const p of players) next[p.id] = p.status;
    prevStatuses.current = next;
    if (fresh.size > 0) {
      setShakingIds(fresh);
      const t = setTimeout(() => setShakingIds(new Set()), 650);
      return () => clearTimeout(t);
    }
  }, [players]);

  return (
    <button
      className={[
        styles.cell,
        isSelected ? styles.selected : "",
        isDangerous ? styles.danger : "",
        room.fogLevel >= 3 ? styles.dangerHigh : "",
        room.hasTrap ? styles.trapped : "",
        room.isGateOpen ? styles.gateOpen : "",
      ].join(" ")}
      onClick={onClick}
      aria-label={room.name}
    >
      {/* Fog shimmer overlay */}
      {isDangerous && <div className={styles.fogOverlay} />}

      {/* Machine repair flash */}
      {repairFlash && <div className={styles.repairFlashOverlay} />}

      {/* Gate unlock ring */}
      {gateFlash && <div className={styles.gateUnlockRing} />}

      {/* Room name */}
      <span className={styles.name}>{room.name}</span>

      {/* Machine progress bar */}
      {machinePercent !== null && (
        <div className={styles.machineBar}>
          <div
            className={[
              styles.machineProgress,
              machinePercent >= 100 ? styles.machineDone : "",
            ].join(" ")}
            style={{ width: `${machinePercent}%` }}
          />
        </div>
      )}

      {/* Gate indicator */}
      {room.isGate && (
        <div className={styles.gateIndicator}>
          {room.isGateOpen ? "🚪 OPEN" : "🔒 GATE"}
        </div>
      )}

      {/* Clues */}
      <div className={styles.clues}>
        {room.hasFootprints && <span title="Footprints">👣</span>}
        {room.scratchMarks && <span title="Scratch marks">✏️</span>}
        {room.hasTrap && <span title="Trap">⚠️</span>}
        {isDangerous && <span className={styles.fogPulse} title="Danger">🌫</span>}
      </div>

      {/* Hunter debug marker */}
      {isHunterHere && (
        <div className={styles.hunterMarker} title="Hunter">👁</div>
      )}

      {/* Player tokens */}
      <div className={styles.tokens}>
        {players.map((p) => {
          const colorIndex = PLAYER_IDS.indexOf(p.id as typeof PLAYER_IDS[number]);
          const color = PLAYER_COLORS[colorIndex] ?? "#888";
          return (
            <div
              key={p.id}
              className={[
                styles.token,
                p.status === "captured" ? styles.tokenCaptured : "",
                p.status === "injured" ? styles.tokenInjured : "",
                p.isControlled ? styles.tokenControlled : "",
                shakingIds.has(p.id) ? styles.tokenCaptureShake : "",
              ].join(" ")}
              style={{ background: color, boxShadow: p.isControlled ? `0 0 8px ${color}` : "none" }}
              title={`${p.name} (${p.status})`}
            >
              {p.status === "captured" ? "🔒" : p.name[0]}
            </div>
          );
        })}
      </div>
    </button>
  );
}
