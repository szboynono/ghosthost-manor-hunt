# Discord Activity Readiness Review — GhostHost: Manor Hunt

*Review date: 2026-04-26*

---

## 1. Current Architecture Summary

**Stack:** Vite 5 + React 18 + TypeScript 5, CSS Modules, no backend, no API keys.

**Engine (`src/game/engine.ts`):**
Pure functional — every action resolver is `(GameState, input) → GameState`. No side effects, no class instances. Uses a seeded XOR-shift RNG (`rng()` / `setSeed()`). Illegal actions fall back silently without throwing. The engine validates all returned states, so a faulty client or LLM Hunter can never corrupt shared state.

**State model (`src/game/types.ts`):**
`GameState` is a plain JSON-serializable object — no circular refs, no functions, no class instances. This means it can be `JSON.stringify`-d and sent over a WebSocket without any transformation. This is the project's single biggest technical asset for Discord integration.

**Hunter AI (`src/game/hunterAI.ts`):**
Exports one function: `decideHunterAction(state: GameState): HunterAction`. The engine calls this function; the rest of the codebase never touches Hunter logic directly. This is an intentional seam — replacing the heuristic with a server-authoritative call or an LLM module is a one-file swap.

**Autopilot (`src/game/autopilot.ts`):**
BFS-based survivor AI for non-controlled players. Trap-aware (avoidTraps=true, fallback false). Used for all four players in demo mode and for players 2–4 in single-player mode.

**Context (`src/context/GameContext.tsx`):**
`useReducer` + `useCallback`. `_runRound` is the orchestration seam — it calls `applyPlayerAction`, then `runHunterTurn`, then `resolveTrapTriggers`, then checks win conditions, then updates React state. In a multiplayer server model, `_runRound` becomes a call to submit the action to the server and receive the new state back.

**Screens:** `MainMenu → Lobby → RoleReveal → GameBoard → ResultScreen | DemoScreen`. Single-player: `isControlled: boolean` on `Player`, hardcoded to `index === 0` in `Lobby.tsx`.

**Sound:** Web Audio API with procedural synthesis — no file assets. Initializes on first user interaction per browser requirement.

**Tests:** 16 Vitest unit tests (engine + hunterAI + autopilot) + 200-game headless simulation harness (`npm run audit:playtest`). Current balance: 43% survivor win rate.

---

## 2. Discord Activity Integration Blockers

### Hard blockers (must fix before any Discord work)

| Blocker | Location | Change required |
|---------|----------|-----------------|
| `isControlled` hardcoded to `index === 0` | `src/screens/Lobby.tsx` | Map Discord user ID → player slot; set `isControlled: userId === discordUserId` |
| Hardcoded player names (Alex/Blake/Casey/Dana) | `src/screens/Lobby.tsx` | Replace with Discord displayName at slot-assignment time |
| No session concept | `GameContext.tsx` | Add session ID and participant list; lobby must wait for 1–4 humans before starting |
| No shared state | All screens | Either lift state to a server or accept single-player-only (bot fills empty slots) |
| RNG is client-local | `engine.ts` | Server must own and advance the RNG; clients receive deterministic state, not their own copy |

### Soft blockers (must fix for good UX but not blocking a proof-of-concept)

| Concern | Notes |
|---------|-------|
| No reconnect path | `GameState` is never persisted; a page reload loses the game. Server must be the source of truth and re-send current state on reconnect. |
| Sound requires user gesture | Web Audio `AudioContext` must be resumed on the first tap inside the Activity iframe — not a blocker but needs explicit handling. |
| No spectator mode | Currently no concept of "watching without acting". Easy to add: non-controlled players just see the board without an action panel. |

### What stays unchanged

- The engine itself: pure functions, no rewiring needed.
- `GameState` shape: already serializable.
- Hunter AI seam: `decideHunterAction` can move to the server unchanged.
- All animations and CSS: client-only, unaffected.
- Demo mode: standalone, no server involvement.

---

## 3. Proposed Discord Architecture

```
Discord Client (iframe)              Server (Node.js / Partykit)
─────────────────────────            ──────────────────────────────
React SPA (this repo)                Express / WS handler
  │                                    │
  ├── Discord Embedded App SDK          ├── session registry (sessionId → GameState)
  │   └── getInstanceConnectedParticipants()  ├── slot assignment (discordUserId → p1/p2/p3/p4)
  │                                    ├── engine.ts (server copy, authoritative)
  ├── WebSocket client                  ├── hunterAI.ts (server copy)
  │   └── send: { type:"action", ... }  ├── autopilot.ts (fills empty slots)
  │   └── recv: { type:"state", state } └── RNG (server-owned, seeded per session)
  │
  └── GameContext (read-only in MP)
      └── renders state from server
```

**Responsibilities split:**

| Concern | Client | Server |
|---------|--------|--------|
| Render state | ✓ | — |
| Validate action legality | Mirror check only | Authoritative |
| Advance RNG | — | ✓ |
| Run Hunter AI | — | ✓ |
| Run Autopilot (empty slots) | — | ✓ |
| Resolve round | — | ✓ |
| Persist session state | — | ✓ |
| Discord identity | ✓ via SDK | Verify via SDK |

**Why server-authoritative:** With 1–4 clients any of whom could disconnect or cheat, the server must own the canonical `GameState`. Clients submit actions; the server applies them, runs the Hunter turn, and broadcasts the new state to all participants. Clients are display terminals.

---

## 4. Minimum Discord MVP

The smallest integrated version that is genuinely playable as a Discord Activity:

1. **Iframe shell** — The SPA loads inside a Discord Activity iframe. The Discord Embedded App SDK is initialized; `getInstanceConnectedParticipants()` returns participants.
2. **Session creation** — First participant creates a session. Server generates a `sessionId` + seeded `GameState`. State is sent to all connected clients.
3. **Slot assignment** — Participants are mapped to player slots in join order. `isControlled` is set per Discord user ID. Empty slots are filled by the server's autopilot.
4. **Lobby gate** — A "Ready" button per participant; game starts when all ready (or host forces start).
5. **Action submission** — Controlled player taps an action → client sends `{ sessionId, playerId, action }` to server → server validates, resolves round, broadcasts new `GameState` to all.
6. **Shared board** — All participants see the same board in real time. Non-controlled players see the map + status bar but no action panel.
7. **Game over** — `ResultScreen` renders for all participants. "Play Again" creates a new session.

**Not in MVP:** Discord Bot, role reveal DM, LLM Hunter, spectators, voice integration, leaderboards.

---

## 5. State Synchronization Plan

**Transport:** WebSocket (Partykit's built-in WS, or `ws` on a plain Node server). One room per `sessionId`.

**Message protocol (minimal):**

```ts
// Client → Server
type ClientMsg =
  | { type: "join";   sessionId: string; discordUserId: string; displayName: string }
  | { type: "ready";  sessionId: string; discordUserId: string }
  | { type: "action"; sessionId: string; playerId: string; action: SurvivorAction };

// Server → Client (broadcast to all in session)
type ServerMsg =
  | { type: "state";   state: GameState }        // after every round
  | { type: "joined";  slots: SlotMap }           // on participant join
  | { type: "error";   message: string };         // illegal action, etc.
```

**Round flow:**
1. Server receives `action` from the controlled player.
2. Server validates: correct `playerId`, correct `phase`, action is legal.
3. Server calls `applyPlayerAction(state, playerId, action)` → partial state.
4. Server runs `runHunterTurn`, `resolveTrapTriggers`, `checkWinCondition`.
5. Server broadcasts new `GameState` to all clients in session.
6. Clients re-render from received state (no local engine call for round resolution).

**Reconnect:** On `join` message for an already-known `discordUserId`, server re-sends the current `GameState`. Client discards local state and re-renders from server state.

**Spectators:** Receive `state` broadcasts but never send `action` messages. Server ignores actions from non-slot-holders.

**RNG:** Server seeds per session (`setSeed(sessionId_hash)`). Clients never call `rng()` for round resolution — only the server advances the RNG. Client-side animations and sound can use `Math.random()` freely (display only).

---

## 6. Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Discord iframe restrictions (CSP, mixed content, cookie access) | High | Must serve Activity over HTTPS. Local dev requires Discord's proxy tunnel (`discord-activity-starter` pattern). |
| WebSocket latency on mobile | Medium | Typical Discord Activity WS round-trip is 50–150ms — fine for turn-based. No real-time animation sync needed. |
| Participant desync (client renders before server broadcasts) | Low | Server-authoritative model prevents this; clients wait for `state` msg before rendering next round. |
| Session abandonment (all participants disconnect) | Medium | Server must garbage-collect sessions after N minutes of inactivity. |
| Cheating (client sends illegal action) | Low | Server validates all actions through the engine's existing legality check. Engine already returns null/noop on illegal input. |
| Discord SDK version drift | Low | Pin SDK version in package.json; SDK changes rarely break embedded apps mid-session. |
| LLM Hunter cost (if added later) | Medium | One LLM call per round × N concurrent sessions can get expensive. Keep the heuristic AI as default; LLM is opt-in. |
| Activity sandboxing limits on Web Audio | Low-Medium | AudioContext is allowed in iframes with `allow="autoplay"` policy. Add that attribute to the iframe when embedding. |

---

## 7. Implementation Phases

### Phase A — Discord shell (1–2 days)
- Install `@discord/embedded-app-sdk`.
- Wrap `main.tsx` with `DiscordSDK.setup()` call; gate render on `READY` event.
- Configure Vite proxy for Discord's OAuth tunnel in dev.
- Ship: app loads in Discord iframe without errors. No gameplay changes.

### Phase B — Identity layer (1 day)
- On `READY`, call `getInstanceConnectedParticipants()` and expose Discord user info via a new `DiscordContext`.
- Replace hardcoded `isControlled: index === 0` with `isControlled: discordUserId === localUserId`.
- Replace hardcoded names with `participant.displayName`.
- Ship: single-player still works; names and avatar come from Discord.

### Phase C — Session & lobby (2–3 days)
- Stand up minimal Node/Partykit server (WS + in-memory session map).
- Lobby screen: "Create Session" / "Join Session" flow. Server assigns slots. Show participant list with ready indicators.
- Server sends initial `GameState` when all ready or host starts.
- Ship: 1–4 Discord users can reach the game board together.

### Phase D — Round sync (2–3 days)
- Move `_runRound` logic to server.
- Client submits action; server resolves and broadcasts.
- All clients render from received state.
- Ship: fully playable 4-player game inside Discord.

### Phase E — Discord Bot (optional, 1–2 days)
- Bot posts session invite link to channel when host creates a session.
- Bot DMs each player their role card at game start.
- Ship: social layer; players don't need to share links manually.

### Phase F — Alpha hardening (ongoing)
- Reconnect flow (re-send state on rejoin).
- Session garbage collection.
- Error states (host leaves, server restart).
- Ship: robust enough for external testers.

---

## 8. What NOT to Do Yet

- **Payments / Nitro gating** — Not until the game has shipped an alpha and has real retention data.
- **Public Activity listing** — Discord review process requires a stable, polished build. Do not submit until Phase F is complete.
- **LLM Hunter** — `decideHunterAction` is ready for it architecturally, but LLM latency (1–3s/call) will stall turns noticeably. Defer until the synchronous heuristic Hunter has been validated in production.
- **Matchmaking / public lobbies** — Scoped Discord session model (invite-only) is simpler and safer for an alpha. Public matchmaking adds queue management, abuse vectors, and moderation surface.
- **Multiple game modes** — One mode, one map, one Hunter. Avoid scope creep until the core loop is validated with real players.
- **Persistent leaderboards / stats** — `computeResult` already produces per-game stats. Store them only after the session model is stable; adding a DB before Phase D is premature.

---

## 9. Go / No-Go Verdict

**Verdict: CONDITIONAL GO**

The codebase is unusually well-positioned for a Discord Activity. The three properties that make integration hard in most games are already satisfied here:

1. `GameState` is fully serializable — zero transformation needed to send over WebSocket.
2. The engine is pure and deterministic — the server can own state and clients can re-render from scratch on any received state.
3. The Hunter AI and round orchestration are already behind clean seams (`decideHunterAction`, `_runRound`) that isolate the server logic cleanly.

**The one genuine prerequisite** before any Discord-specific code is written: replace `isControlled: index === 0` in `Lobby.tsx` with Discord-identity-aware slot assignment. Every other integration step stacks on top of this. This is a single-file change (~20 lines) and should be done as the first commit of Phase B.

**Recommended entry point:** Phase A (Discord shell) can be done in a weekend. Phases A–D represent a shippable proof-of-concept with no major architectural unknowns. The Discord gate checklist in `docs/harness/DISCORD_GATE.md` is satisfiable at the end of Phase D.

**Do not begin** Phase C (server) until Phase B (identity) is shipping and tested in the Discord iframe — identity is load-bearing for the entire session model.
