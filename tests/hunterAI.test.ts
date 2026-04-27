import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/game/initialState";
import { decideHunterAction } from "../src/game/hunterAI";
import { isHunterActionValid } from "../src/game/engine";

describe("Hunter AI – The Warden", () => {
  it("produces a valid action from initial state", () => {
    const state = createInitialState();
    const action = decideHunterAction(state);
    expect(isHunterActionValid(state, action)).toBe(true);
  });

  it("guards captured player in same room", () => {
    let state = createInitialState();
    state = {
      ...state,
      hunter: { ...state.hunter, roomId: "library" },
      players: {
        ...state.players,
        p1: { ...state.players["p1"], roomId: "library", status: "captured", captureCountdown: 2 },
      },
    };
    const action = decideHunterAction(state);
    expect(action.type).toBe("guard");
    if (action.type === "guard") expect(action.targetPlayerId).toBe("p1");
  });

  it("chases injured player in adjacent room", () => {
    let state = createInitialState();
    // Hunter in eastHall, p2 injured in library (adjacent)
    state = {
      ...state,
      hunter: { ...state.hunter, roomId: "eastHall" },
      players: {
        ...state.players,
        p2: { ...state.players["p2"], roomId: "library", status: "injured" },
      },
    };
    const action = decideHunterAction(state);
    expect(action.type).toBe("chase");
    if (action.type === "chase") expect(action.targetPlayerId).toBe("p2");
  });

  it("blocks exit when machines almost complete", () => {
    let state = createInitialState();
    // Hunter in lobby (adjacent to gateA), machines = 4
    state = {
      ...state,
      machinesRepaired: 4,
      hunter: { ...state.hunter, roomId: "lobby" },
    };
    const action = decideHunterAction(state);
    expect(action.type).toBe("blockExit");
  });

  it("traps high-progress generator room ahead of listen when score is high", () => {
    let state = createInitialState();
    // Hunter at lobby. basement (adjacent) has 75% progress — score=3, fires before listen.
    // eastHall has noise=2 to confirm trap beats listen.
    // All players out of reachable range so no chase fires.
    state = {
      ...state,
      machinesRepaired: 2,
      hunter: {
        ...state.hunter,
        roomId: "lobby",
        trappedRooms: [],
        lastKnownTargetId: null,
      },
      players: {
        ...state.players,
        p1: { ...state.players["p1"], roomId: "library" },
        p2: { ...state.players["p2"], roomId: "kitchen" },
        p3: { ...state.players["p3"], roomId: "boilerRoom" },
        p4: { ...state.players["p4"], roomId: "boilerRoom" },
      },
      rooms: {
        ...state.rooms,
        basement: { ...state.rooms["basement"], machineProgress: 75 },
      },
      noiseMap: {
        library: 0, eastHall: 2, kitchen: 0, basement: 0,
        lobby: 0, greenhouse: 0, boilerRoom: 0, gateA: 0, gateB: 0,
      },
    };
    const action = decideHunterAction(state);
    expect(action.type).toBe("trap");
    if (action.type === "trap") expect(action.roomId).toBe("basement");
  });
});
