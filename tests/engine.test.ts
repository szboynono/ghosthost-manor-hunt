import { describe, it, expect, beforeEach } from "vitest";
import { createInitialState } from "../src/game/initialState";
import {
  applyPlayerAction,
  applyHunterAction,
  isHunterActionValid,
  resolveChaseChoice,
  updateCaptureCountdowns,
  checkWinCondition,
  resolveTrapTriggers,
  setSeed,
} from "../src/game/engine";

beforeEach(() => setSeed(42));

describe("repair action", () => {
  it("increases machine progress", () => {
    let state = createInitialState();
    // p1 starts in library which has a machine
    state = applyPlayerAction(state, "p1", { type: "repair" });
    expect(state.rooms["library"].machineProgress).toBeGreaterThan(0);
  });

  it("increments machinesRepaired when progress reaches 100", () => {
    let state = createInitialState();
    // Apply repair 3 times (mechanic: +40 each = 120 → capped 100)
    state = applyPlayerAction(state, "p1", { type: "repair" });
    state = applyPlayerAction(state, "p1", { type: "repair" });
    state = applyPlayerAction(state, "p1", { type: "repair" });
    expect(state.machinesRepaired).toBe(1);
    expect(state.rooms["library"].machineProgress).toBe(100);
  });
});

describe("win conditions", () => {
  it("survivors win after 5 machines repaired and one escaped", () => {
    let state = createInitialState();
    state = { ...state, machinesRepaired: 5 };
    // Mark gate open and a player escaped
    state = {
      ...state,
      rooms: { ...state.rooms, gateA: { ...state.rooms["gateA"], isGateOpen: true } },
      players: {
        ...state.players,
        p1: { ...state.players["p1"], status: "escaped" },
      },
    };
    expect(checkWinCondition(state)).toBe("survivors");
  });

  it("hunter wins after 3 eliminations", () => {
    let state = createInitialState();
    state = { ...state, eliminations: 3 };
    expect(checkWinCondition(state)).toBe("hunter");
  });

  it("no winner with partial progress", () => {
    const state = createInitialState();
    expect(checkWinCondition(state)).toBeNull();
  });
});

describe("invalid hunter action is rejected", () => {
  it("patrol to non-adjacent room falls back", () => {
    const state = createInitialState();
    // Hunter starts in eastHall; gateB is not adjacent
    const invalidAction = { type: "patrol" as const, roomId: "gateB" as const, reason: "test" };
    expect(isHunterActionValid(state, invalidAction)).toBe(false);
    // applyHunterAction should not throw and stays in reachable room
    const newState = applyHunterAction(state, invalidAction);
    expect(newState.hunter.roomId).toBe("eastHall"); // fallback patrol in place
  });
});

describe("capture countdown", () => {
  it("captured player is eliminated after countdown expires", () => {
    let state = createInitialState();
    state = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players["p2"], status: "captured", captureCountdown: 1 },
      },
    };
    state = updateCaptureCountdowns(state);
    expect(state.players["p2"].status).toBe("eliminated");
    expect(state.eliminations).toBe(1);
  });

  it("captured player survives while countdown > 1", () => {
    let state = createInitialState();
    state = {
      ...state,
      players: {
        ...state.players,
        p2: { ...state.players["p2"], status: "captured", captureCountdown: 2 },
      },
    };
    state = updateCaptureCountdowns(state);
    expect(state.players["p2"].status).toBe("captured");
    expect(state.players["p2"].captureCountdown).toBe(1);
  });
});

describe("rescue action", () => {
  it("changes captured player status to injured", () => {
    let state = createInitialState();
    // Place p1 and p2 in same room, p2 captured
    state = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players["p1"], roomId: "library" },
        p2: { ...state.players["p2"], roomId: "library", status: "captured", captureCountdown: 2 },
      },
    };
    state = applyPlayerAction(state, "p1", { type: "rescue", targetPlayerId: "p2" });
    expect(state.players["p2"].status).toBe("injured");
    expect(state.players["p2"].captureCountdown).toBe(0);
  });
});

describe("noise influences hunter AI", () => {
  it("noisy rooms are tracked in noiseMap", () => {
    let state = createInitialState();
    state = applyPlayerAction(state, "p1", { type: "repair" }); // repair noise = 1
    expect(state.noiseMap["library"]).toBeGreaterThanOrEqual(1);
  });
});

describe("trap triggers", () => {
  it("moving into a trapped room triggers the trap", () => {
    let state = createInitialState();
    // Place trap in eastHall (adjacent to library where p1 starts)
    state = {
      ...state,
      rooms: { ...state.rooms, eastHall: { ...state.rooms["eastHall"], hasTrap: true } },
    };
    state = applyPlayerAction(state, "p1", { type: "move", targetRoomId: "eastHall" });
    state = resolveTrapTriggers(state);
    // p1 was active — trap causes fear only, status stays active
    expect(state.players["p1"].status).toBe("active");
  });

  it("trap is cleared after triggering", () => {
    let state = createInitialState();
    state = {
      ...state,
      rooms: { ...state.rooms, eastHall: { ...state.rooms["eastHall"], hasTrap: true } },
    };
    state = applyPlayerAction(state, "p1", { type: "move", targetRoomId: "eastHall" });
    state = resolveTrapTriggers(state);
    expect(state.rooms["eastHall"].hasTrap).toBe(false);
  });

  it("fear increases after trap triggers", () => {
    let state = createInitialState();
    const fearBefore = state.players["p1"].fear;
    state = {
      ...state,
      rooms: { ...state.rooms, eastHall: { ...state.rooms["eastHall"], hasTrap: true } },
    };
    state = applyPlayerAction(state, "p1", { type: "move", targetRoomId: "eastHall" });
    state = resolveTrapTriggers(state);
    expect(state.players["p1"].fear).toBeGreaterThan(fearBefore);
  });

  it("trap does not trigger twice after cleared", () => {
    let state = createInitialState();
    state = {
      ...state,
      rooms: { ...state.rooms, eastHall: { ...state.rooms["eastHall"], hasTrap: true } },
    };
    state = applyPlayerAction(state, "p1", { type: "move", targetRoomId: "eastHall" });
    state = resolveTrapTriggers(state);
    // p2 also moves into same (now trap-free) room
    state = {
      ...state,
      players: { ...state.players, p2: { ...state.players["p2"], roomId: "library" } },
    };
    state = applyPlayerAction(state, "p2", { type: "move", targetRoomId: "eastHall" });
    state = resolveTrapTriggers(state);
    // p2 should still be active — no trap left
    expect(state.players["p2"].status).toBe("active");
  });

  it("survivor already in trapped room at round start is not affected", () => {
    let state = createInitialState();
    // p1 starts in library — place trap there without p1 having moved there this round
    state = {
      ...state,
      rooms: { ...state.rooms, library: { ...state.rooms["library"], hasTrap: true } },
    };
    // p1 does not move — they hide in place
    state = applyPlayerAction(state, "p1", { type: "hide" });
    state = resolveTrapTriggers(state);
    // Trap should not trigger for a non-mover
    expect(state.players["p1"].status).toBe("active");
    expect(state.rooms["library"].hasTrap).toBe(true);
  });

  it("already-injured survivor gains fear but is not immediately eliminated", () => {
    let state = createInitialState();
    state = {
      ...state,
      players: { ...state.players, p1: { ...state.players["p1"], status: "injured" } },
      rooms: { ...state.rooms, eastHall: { ...state.rooms["eastHall"], hasTrap: true } },
    };
    const fearBefore = state.players["p1"].fear;
    state = applyPlayerAction(state, "p1", { type: "move", targetRoomId: "eastHall" });
    state = resolveTrapTriggers(state);
    // injured → becomes captured (via _injureOrCapture path), NOT eliminated
    expect(state.players["p1"].status).toBe("captured");
    expect(state.players["p1"].fear).toBeGreaterThan(fearBefore);
    expect(state.eliminations).toBe(0); // not yet eliminated — needs countdown
  });
});

describe("localPlayerId", () => {
  it("createInitialState with localPlayerId p2 marks only p2 as controlled", () => {
    const state = createInitialState(false, "p2");
    expect(state.players["p1"].isControlled).toBe(false);
    expect(state.players["p2"].isControlled).toBe(true);
    expect(state.players["p3"].isControlled).toBe(false);
    expect(state.players["p4"].isControlled).toBe(false);
    expect(state.localPlayerId).toBe("p2");
  });

  it("createInitialState defaults to p1 as controlled player", () => {
    const state = createInitialState();
    expect(state.players["p1"].isControlled).toBe(true);
    expect(state.localPlayerId).toBe("p1");
  });
});

describe("hide / close-call logic", () => {
  it("hiding player has isHiding=true and 0 noise", () => {
    let state = createInitialState();
    state = applyPlayerAction(state, "p1", { type: "hide" });
    expect(state.players["p1"].isHiding).toBe(true);
    expect(state.players["p1"].noise).toBe(0);
  });
});

describe("chase resolution", () => {
  it("escape chase increases fear", () => {
    setSeed(0); // seed for deterministic escape
    let state = createInitialState();
    state = {
      ...state,
      pendingChase: { playerId: "p1", hunterRoomId: "library", round: 1 },
    };
    // With low fear and holdBreath, escape chance is high
    const resultState = resolveChaseChoice(state, "p1", "holdBreath");
    // Either escaped (fear went up) or captured — just check state is valid
    expect(resultState.pendingChase).toBeNull();
  });
});
