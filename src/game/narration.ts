import type { GameState, GameEvent } from "./types";

// ─── Event card text pools ────────────────────────────────────────────────────

const PATROL_LINES = [
  "Footsteps echo down the corridor…",
  "A shadow flickers across the wall.",
  "The floorboards creak above you.",
  "Something is breathing nearby.",
  "A door slams in the distance.",
];

const ALERTED_LINES = [
  "The Warden stops. Listens. Turns.",
  "It heard something. Stay still.",
  "Silence — then a heavy step toward you.",
  "The manor holds its breath.",
];

const REPAIR_COMPLETE = [
  "The generator roars to life.",
  "Power surges through the manor walls.",
  "Wires spark — one more machine online.",
  "The hum of electricity fills the room.",
];

const TRAP_LINES = [
  "A snap of metal. Too late to avoid it.",
  "The floor gave way. The Warden planned ahead.",
  "Pain. Noise. The Warden will have heard that.",
];

const RESCUED_LINES = [
  "Pulled from the chair — barely breathing.",
  "Dragged free before time ran out.",
  "Back on their feet. Run.",
];

const CLOSE_CALL_LINES = [
  "It walked right past. Don't move.",
  "Missed by inches. The hunt continues.",
  "The Warden checked the room. Found nothing.",
];

const CAPTURE_LINES = [
  "The Warden's grip is iron. No escape.",
  "Dragged off into the dark.",
  "Gone. Save them before it's too late.",
];

const INJURED_LINES = [
  "Wounded. Every step leaves a trail.",
  "Bleeding and afraid. The Warden smells fear.",
  "Barely standing. One more hit ends it.",
];

const ELIMINATED_LINES = [
  "The chair claimed another soul.",
  "No rescue came in time.",
  "The manor has one more ghost now.",
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Pick the most dramatic event from this round ────────────────────────────

export function generateRoundEvent(state: GameState): GameEvent {
  const { machinesRepaired, eliminations, round, events } = state;

  // Check what just happened this round (last few events in the log)
  const recentTypes = new Set(events.slice(-4).map(e => e.type));

  // 1. Elimination — most dramatic possible
  if (recentTypes.has("eliminated")) {
    const elim = events.slice().reverse().find(e => e.type === "eliminated");
    return {
      type: "eliminated",
      title: elim?.title ?? "Survivor Lost",
      description: pick(ELIMINATED_LINES),
      icon: "💀",
      severity: "danger",
    };
  }

  // 2. Captured
  if (recentTypes.has("captured")) {
    const cap = events.slice().reverse().find(e => e.type === "captured");
    return {
      type: "captured",
      title: cap?.title ?? "Captured!",
      description: pick(CAPTURE_LINES),
      icon: "🔒",
      severity: "danger",
    };
  }

  // 3. Trap triggered
  if (recentTypes.has("trapTriggered")) {
    return {
      type: "trapTriggered",
      title: "Trap Sprung!",
      description: pick(TRAP_LINES),
      icon: "⚠️",
      severity: "danger",
    };
  }

  // 4. Escaped through gate
  if (recentTypes.has("escaped") && events.slice().reverse().find(e => e.type === "escaped" && e.icon === "🚪")) {
    return {
      type: "escaped",
      title: "Escaped!",
      description: "One survivor slipped through the gate. The rest must follow.",
      icon: "🚪",
      severity: "success",
    };
  }

  // 5. Machine just hit 100%
  if (machinesRepaired >= 1 && recentTypes.has("repaired")) {
    const machinesLeft = 5 - machinesRepaired;
    return {
      type: "repaired",
      title: "Generator Online!",
      description: machinesLeft > 0
        ? `${pick(REPAIR_COMPLETE)} ${machinesLeft} more to go.`
        : `${pick(REPAIR_COMPLETE)} All machines running — find the gates!`,
      icon: "⚙️",
      severity: "success",
    };
  }

  // 6. Rescued
  if (recentTypes.has("rescued")) {
    return {
      type: "rescued",
      title: "Rescue!",
      description: pick(RESCUED_LINES),
      icon: "🩺",
      severity: "success",
    };
  }

  // 7. Close call
  if (recentTypes.has("closeCall")) {
    return {
      type: "closeCall",
      title: "Close Call",
      description: pick(CLOSE_CALL_LINES),
      icon: "💨",
      severity: "warning",
    };
  }

  // 8. Found hiding but not yet captured
  if (recentTypes.has("found")) {
    return {
      type: "found",
      title: "Found!",
      description: pick(INJURED_LINES),
      icon: "👁",
      severity: "danger",
    };
  }

  // 9. Hunter alerted — approaching
  if (state.hunter.isAlerted) {
    return {
      type: "hunterAlert",
      title: "The Warden Heard You",
      description: pick(ALERTED_LINES),
      icon: "👣",
      severity: "danger",
    };
  }

  // 10. Nearly done — 4 machines repaired
  if (machinesRepaired >= 4) {
    return {
      type: "almostDone",
      title: "One More Machine",
      description: "The exit gates are straining against their locks. Almost there.",
      icon: "⚡",
      severity: "success",
    };
  }

  // 11. Eliminations happened earlier, rising dread
  if (eliminations > 0 && round % 4 === 0) {
    return {
      type: "dread",
      title: "The Manor Tightens",
      description: `${eliminations} soul${eliminations > 1 ? "s" : ""} lost. The Warden grows bolder.`,
      icon: "🕯",
      severity: "warning",
    };
  }

  // 12. Default ambient
  return {
    type: "ambient",
    title: `Round ${round + 1}`,
    description: pick(PATROL_LINES),
    icon: "🕯",
    severity: "info",
  };
}
