import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { GameState, PlayerId, SurvivorAction, ChaseChoice, Screen, GameResult } from "../game/types";
import { createInitialState } from "../game/initialState";
import {
  applyPlayerAction, applyHunterAction, resolveChaseChoice,
  updateFear, updateCaptureCountdowns, updateGates,
  resolveEscapes, advanceRound, checkWinCondition,
  resolveTrapTriggers,
} from "../game/engine";
import { decideHunterAction } from "../game/hunterAI";
import { decideAutopilotAction } from "../game/autopilot";
import { generateRoundEvent } from "../game/narration";
import { computeResult } from "../game/scoring";
import { soundManager } from "../sound/soundManager";

interface GameCtx {
  screen: Screen;
  gameState: GameState | null;
  result: GameResult | null;
  muted: boolean;
  goTo: (s: Screen) => void;
  // Future Discord: pass localPlayerId from Discord user → player-slot mapping
  startGame: (debug?: boolean, localPlayerId?: PlayerId) => void;
  submitAction: (playerId: PlayerId, action: SurvivorAction) => void;
  resolveChase: (playerId: PlayerId, choice: ChaseChoice) => void;
  dismissEvent: () => void;
  toggleMute: () => void;
  toggleDebug: () => void;
}

const Ctx = createContext<GameCtx | null>(null);

export function useGame(): GameCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame must be inside GameProvider");
  return ctx;
}

interface State {
  screen: Screen;
  gameState: GameState | null;
  result: GameResult | null;
  muted: boolean;
}

type Action =
  | { type: "GO_TO"; screen: Screen }
  | { type: "START_GAME"; debug: boolean; localPlayerId: PlayerId }
  | { type: "SET_GAME"; state: GameState }
  | { type: "SET_RESULT"; result: GameResult }
  | { type: "TOGGLE_MUTE" }
  | { type: "DISMISS_EVENT" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "GO_TO":
      return { ...state, screen: action.screen };
    case "START_GAME":
      return {
        ...state,
        gameState: createInitialState(action.debug, action.localPlayerId),
        result: null,
        screen: "roleReveal",
      };
    case "SET_GAME":
      return { ...state, gameState: action.state };
    case "SET_RESULT":
      return { ...state, result: action.result, screen: "result" };
    case "TOGGLE_MUTE": {
      const m = !state.muted;
      soundManager.setMuted(m);
      return { ...state, muted: m };
    }
    case "DISMISS_EVENT": {
      if (!state.gameState) return state;
      return {
        ...state,
        gameState: { ...state.gameState, currentEvent: null, phase: "survivorsChoosing" },
      };
    }
    default:
      return state;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    screen: "mainMenu",
    gameState: null,
    result: null,
    muted: false,
  });

  const goTo = useCallback((screen: Screen) => dispatch({ type: "GO_TO", screen }), []);

  const startGame = useCallback((debug = false, localPlayerId: PlayerId = "p1") => {
    soundManager.play("click");
    dispatch({ type: "START_GAME", debug, localPlayerId });
  }, []);

  const _runRound = useCallback((gs: GameState): GameState => {
    // 1. Apply all survivor actions (autopilot fills non-controlled)
    let s = gs;
    for (const pid of ["p1", "p2", "p3", "p4"] as PlayerId[]) {
      const player = s.players[pid];
      if (player.status !== "active" && player.status !== "injured") continue;
      if (s.survivorActions[pid]) {
        s = applyPlayerAction(s, pid, s.survivorActions[pid]!);
      } else if (!player.isControlled || gs.isDebugMode) {
        const auto = decideAutopilotAction(s, pid);
        s = applyPlayerAction(s, pid, auto);
      }
    }

    // 2. Resolve traps for survivors who moved this round
    s = resolveTrapTriggers(s);

    // 3. Hunter action
    const hunterAction = decideHunterAction(s);
    s = applyHunterAction(s, hunterAction);

    // 4. If chase encountered, pause here
    if (s.phase === "chaseEncounter") return s;

    // 5. End-of-round updates
    s = updateFear(s);
    s = updateCaptureCountdowns(s);
    s = updateGates(s);
    s = resolveEscapes(s);

    // 6. Check win
    const winner = checkWinCondition(s);
    if (winner) {
      s = { ...s, winner, phase: "gameOver" };
      return s;
    }

    // 7. Generate round event
    const event = generateRoundEvent(s);
    s = { ...s, currentEvent: event, phase: "showingEvent" };

    return s;
  }, []);

  const submitAction = useCallback((playerId: PlayerId, action: SurvivorAction) => {
    if (!state.gameState) return;
    soundManager.play("click");

    let gs = {
      ...state.gameState,
      survivorActions: { ...state.gameState.survivorActions, [playerId]: action },
    };

    // In single-player mode (not debug), run the round when the controlled player submits
    const controlled = Object.values(gs.players).find((p) => p.isControlled);
    if (controlled && controlled.id === playerId && !gs.isDebugMode) {
      gs = _runRound(gs);
    } else if (gs.isDebugMode) {
      // In debug mode, run when all active players have submitted
      const active = Object.values(gs.players).filter(
        (p) => p.status === "active" || p.status === "injured",
      );
      const allSubmitted = active.every((p) => gs.survivorActions[p.id]);
      if (allSubmitted) gs = _runRound(gs);
    }

    if (gs.phase === "gameOver" && gs.winner) {
      dispatch({ type: "SET_GAME", state: gs });
      dispatch({ type: "SET_RESULT", result: computeResult(gs) });
      return;
    }

    dispatch({ type: "SET_GAME", state: gs });
  }, [state.gameState, _runRound]);

  const resolveChase = useCallback((playerId: PlayerId, choice: ChaseChoice) => {
    if (!state.gameState) return;
    soundManager.play(choice === "holdBreath" ? "click" : "capture");

    let gs = resolveChaseChoice(state.gameState, playerId, choice);
    gs = updateFear(gs);
    gs = updateCaptureCountdowns(gs);
    gs = updateGates(gs);
    gs = resolveEscapes(gs);

    const winner = checkWinCondition(gs);
    if (winner) {
      gs = { ...gs, winner, phase: "gameOver" };
      dispatch({ type: "SET_GAME", state: gs });
      dispatch({ type: "SET_RESULT", result: computeResult(gs) });
      return;
    }

    const event = generateRoundEvent(gs);
    gs = { ...gs, currentEvent: event, phase: "showingEvent" };
    dispatch({ type: "SET_GAME", state: gs });
  }, [state.gameState]);

  const dismissEvent = useCallback(() => {
    if (!state.gameState) return;
    const gs = advanceRound(state.gameState);
    dispatch({ type: "SET_GAME", state: gs });
    // not dispatching DISMISS_EVENT since advanceRound already resets phase
  }, [state.gameState]);

  const toggleMute = useCallback(() => dispatch({ type: "TOGGLE_MUTE" }), []);

  const toggleDebug = useCallback(() => {
    if (!state.gameState) return;
    dispatch({
      type: "SET_GAME",
      state: { ...state.gameState, isDebugMode: !state.gameState.isDebugMode },
    });
  }, [state.gameState]);

  return (
    <Ctx.Provider
      value={{
        screen: state.screen,
        gameState: state.gameState,
        result: state.result,
        muted: state.muted,
        goTo,
        startGame,
        submitAction,
        resolveChase,
        dismissEvent,
        toggleMute,
        toggleDebug,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
