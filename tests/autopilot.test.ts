import { describe, it, expect, beforeEach } from "vitest";
import { createInitialState } from "../src/game/initialState";
import { decideAutopilotAction } from "../src/game/autopilot";
import { setSeed } from "../src/game/engine";
import type { SurvivorAction } from "../src/game/types";

beforeEach(() => setSeed(42));

describe("trap-aware autopilot", () => {
  it("prefers untrapped route to a machine when a trap-free alternative exists", () => {
    let state = createInitialState();
    // p1 starts at library. Library machine is complete.
    // eastHall is trapped — the direct 1-step path to kitchen's machine.
    // Untrapped path to basement exists (library → basement, 1 step).
    // Basement machine is incomplete and untrapped.
    // kitchen, greenhouse, boilerRoom are complete.
    state = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players["p1"], roomId: "eastHall" },
      },
      hunter: { ...state.hunter, roomId: "gateB" }, // far away, no hide triggered
      rooms: {
        ...state.rooms,
        library:    { ...state.rooms["library"],    hasTrap: true, machineProgress: 100 },
        kitchen:    { ...state.rooms["kitchen"],    machineProgress: 100 },
        greenhouse: { ...state.rooms["greenhouse"], machineProgress: 100 },
        boilerRoom: { ...state.rooms["boilerRoom"], machineProgress: 100 },
        // basement: machineProgress stays 0 (incomplete, untrapped)
      },
      machinesRepaired: 4,
    };

    const action = decideAutopilotAction(state, "p1");
    expect(action.type).toBe("move");
    // Should navigate toward basement (via lobby), not into the trapped library
    expect((action as Extract<SurvivorAction, { type: "move" }>).targetRoomId).not.toBe("library");
  });

  it("still navigates through a trapped room when no trap-free path exists", () => {
    let state = createInitialState();
    // p1 at lobby. Only boilerRoom machine remains.
    // Both paths to boilerRoom go through trapped rooms:
    //   lobby → basement (trapped) → boilerRoom
    //   lobby → gateA   (trapped) → boilerRoom
    state = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players["p1"], roomId: "lobby" },
      },
      hunter: { ...state.hunter, roomId: "library" }, // not adjacent to lobby
      rooms: {
        ...state.rooms,
        library:    { ...state.rooms["library"],    machineProgress: 100 },
        kitchen:    { ...state.rooms["kitchen"],    machineProgress: 100 },
        greenhouse: { ...state.rooms["greenhouse"], machineProgress: 100 },
        basement:   { ...state.rooms["basement"],   machineProgress: 100, hasTrap: true },
        gateA:      { ...state.rooms["gateA"],      hasTrap: true },
        // boilerRoom: machineProgress stays 0 (incomplete)
      },
      machinesRepaired: 4,
    };

    const action = decideAutopilotAction(state, "p1");
    expect(action.type).toBe("move");
    // Fallback must find a path — basement or gateA (both trapped, but only options)
    const target = (action as Extract<SurvivorAction, { type: "move" }>).targetRoomId;
    expect(["basement", "gateA"]).toContain(target);
  });
});
