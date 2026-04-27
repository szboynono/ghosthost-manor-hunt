# GhostHost: Manor Hunt

4 Survivors. 1 AI Hunter. Escape the manor.

A mobile-first visual horror board game prototype. No backend, no API keys, playable in any browser.

## Development Harness

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Architecture rules, mobile constraints, output format |
| [docs/harness/WORKFLOW.md](docs/harness/WORKFLOW.md) | 6-step workflow for Claude Code |
| [docs/harness/ACCEPTANCE_CRITERIA.md](docs/harness/ACCEPTANCE_CRITERIA.md) | Per-change checklists |
| [docs/harness/GAME_FEEL_RUBRIC.md](docs/harness/GAME_FEEL_RUBRIC.md) | 9-dimension game feel scoring |
| [docs/harness/DISCORD_GATE.md](docs/harness/DISCORD_GATE.md) | Gate checklist before any Discord work |
| [docs/harness/PROMPTS.md](docs/harness/PROMPTS.md) | Reusable prompt templates |

```bash
npm run check          # test + tsc + build in one shot
npm run audit:playtest # 200-game headless simulation with stats
```

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 28 engine + AI + autopilot tests
npm run build      # production bundle
```

## Running as a Discord Activity

GhostHost supports two modes:

**Local browser mode (default — no Discord required):**
```bash
npm run dev
```
Open `http://localhost:5173`. The footer shows **Local Mode**. No configuration needed.

**Discord Activity mode:**
1. Create an application at [discord.com/developers/applications](https://discord.com/developers/applications) and enable Embedded Activity.
2. Copy `.env.example` to `.env` and fill in your client ID:
   ```
   VITE_DISCORD_CLIENT_ID=your_client_id_here
   ```
3. Run `npm run dev` and open through Discord's activity proxy tunnel (see Discord's embedded-app quickstart).

The Main Menu footer shows the current mode:

| Label | Meaning |
|-------|---------|
| Local Mode | Running in browser, no Discord SDK |
| Discord... | SDK initializing |
| Discord · N players | Connected — N connected participants fetched |
| Discord Error | SDK init failed — check client ID and environment |

### Phase B — Identity injection

When Discord mode is active, the app fetches connected participants via `sdk.commands.getInstanceConnectedParticipants()`, maps them to slots in join order, and shows Discord names and avatars in the Lobby. `mappedPlayerId` defaults to `"p1"` (first slot); precise per-user identity is resolved in Phase C via OAuth.

### Phase C — Shared session server (current)

A minimal in-memory WebSocket server (`server/sessionServer.ts`) lets multiple clients with the same `instanceId` see each other in the same lobby with stable slot assignments and host-triggered game start.

**Local multi-tab testing:**

```bash
# Terminal 1 — session server
npm run dev:server

# Terminal 2 — frontend
npm run dev
```

Open `http://localhost:5173?instanceId=dev-room` in two browser windows. Both windows share the lobby — each sees the other's name. The first to join is the host (⚡ Begin Hunt); others see a Ready Up button. When the host clicks Begin Hunt, all clients start simultaneously.

**Instance ID resolution order:**
1. Discord `sdk.instanceId` (when running as a Discord Activity)
2. `?instanceId=` URL query param
3. `VITE_DEV_INSTANCE_ID` env var
4. No session (local single-player fallback)

**`.env` variables for Phase C:**

| Variable | Purpose |
|----------|---------|
| `VITE_SESSION_SERVER_URL` | WebSocket URL of the session server (e.g. `ws://localhost:3001`) |
| `VITE_DEV_INSTANCE_ID` | Default instance ID for local dev when Discord SDK is absent |

**Current limitations:**
- No gameplay sync — each client runs its own local game after hunt start. Phase D introduces shared `GameState`.
- No reconnection — refreshing the tab creates a new session slot.
- Display names default to "Player" when Discord identity is unavailable (local testing).

## Demo / Watch Mode

Tap **👁 Watch a Game** from the Main Menu to start an automated playthrough showcasing the game's key moments.

| Control | Action |
|---------|--------|
| ▶ / ⏸ | Play / Pause auto-advance |
| › | Skip to next moment |
| ↩ | Restart demo from beginning |
| ✕ | Exit to Main Menu |
| Progress dots | Jump to any moment |

The demo runs ~80 seconds unattended (4 s per calm moment, 8 s on event cards and chase). The Hunter is always visible. Use **⏸ Pause** to hold on a moment for screen recording.

**Sequence:**
1. The Hunt Begins
2. Repairs Underway
3. Generator Online! *(repair flash)*
4. Mid-Game Tension
5. The Warden Closes In *(danger event)*
6. Chase — Hold Your Breath! *(ChaseModal — tap any choice or wait)*
7. Trap Set
8. Into the Trap…
9. Trap Sprung!
10. Survivor Captured *(capture shake)*
11. Rescue!
12. All Generators Online *(gate unlock ring)*
13. Escape! → **Recap card** (MVP · Most Reckless · Hunter Note)

**For screen recordings:** hit record on your device, tap Watch a Game, let it play through. No manual gameplay required.

## Gameplay

**Goal:** Repair 5 generators, then escape through Gate A or Gate B before The Warden captures 3 survivors.

**Turn order:**
1. You choose an action (Move, Repair, Hide, Scout, Rescue, Heal, Distract)
2. The AI Hunter (The Warden) acts
3. Engine resolves encounters, updates fear/heartbeat, checks win condition
4. Event card summarises what happened
5. Repeat

**Tap a room on the map** to select it, then pick an action from the bottom panel.

**Roles:**
| Role | Ability |
|------|---------|
| Mechanic (Alex) | Repairs 2× faster |
| Medic (Blake) | Heals and rescues teammates |
| Scout (Casey) | Reveals Hunter danger clues |
| Decoy (Dana) | Generates loud noise to redirect Hunter |

**Chase encounters:** If The Warden finds you, choose Hold Breath / Run / Throw Object / Call for Help. Outcome depends on fear level and role.

**Capture system:** Getting caught while injured → Captured → 2 rounds for teammates to Rescue → Eliminated.

**Debug mode:** Available in Lobby. Shows Hunter location, lets you control all 4 survivors.

## Architecture

```
src/
  game/
    types.ts        — all TypeScript types
    constants.ts    — room layout, adjacency, tuning values
    initialState.ts — state factory
    engine.ts       — deterministic action resolver (pure functions)
    hunterAI.ts     — The Warden heuristic (same interface as future LLM module)
    autopilot.ts    — survivor AI for non-controlled players
    narration.ts    — event card text generation
    scoring.ts      — end-game result computation
    demoRunner.ts   — scripted demo state sequence
  context/
    GameContext.tsx — React state + round orchestration
  screens/          — MainMenu, Lobby, RoleReveal, GameBoard, ResultScreen, DemoScreen
  components/       — ManorMap, RoomCell, StatusBar, ActionPanel
  sound/
    soundManager.ts — Web Audio (no file assets)
tests/
  engine.test.ts    — 12 engine unit tests
  hunterAI.test.ts  — 4 AI tests
```

## Hunter AI interface

`src/game/hunterAI.ts` exports a single function:

```typescript
export function decideHunterAction(state: GameState): HunterAction
```

To swap in an LLM-based Hunter, replace this function with one that calls your LLM and returns a valid `HunterAction`. The engine validates the returned action and falls back to patrol if invalid — the LLM can never break game state.

## Discord Activity integration path

1. Wrap the app in the [Discord Embedded App SDK](https://discord.com/developers/docs/activities/overview)
2. Add a small Express/Node server for shared game state (WebSockets or Partykit)
3. Replace `isControlled: index === 0` logic with Discord user → player-slot mapping
4. The game engine stays unchanged — it's already pure and deterministic

## Known limitations

- Single-player (1 human + 3 autopilot). Multiplayer requires a shared state server.
- Autopilot survivors are simple (always head for nearest machine).
- Sound requires user interaction to initialise AudioContext (browser requirement).
- No persistence — refreshing resets the game.
