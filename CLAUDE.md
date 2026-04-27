# GhostHost: Manor Hunt — Claude Code Instructions

## Product

4 survivors vs 1 AI Hunter (The Warden). Mobile-first visual horror board game. Local browser prototype. No backend, no auth, no real-money features.

**Feel:** Horror mobile board game. If it feels like a form, a text bot, or a text adventure, it failed.

## Current phase

**Local vertical slice.** All work is scoped to the browser prototype. Discord integration is explicitly blocked — see `docs/harness/DISCORD_GATE.md`.

## Non-goals (do not implement)

- Discord Activity / Bot integration
- Backend server or WebSocket layer
- Multiplayer state sync
- Payments or public listing
- Real LLM API calls during gameplay
- Persistent accounts or save files

---

## Architecture boundaries

```
src/game/          — deterministic engine and game logic (HIGH risk)
  engine.ts        — pure action resolver; no side effects
  hunterAI.ts      — Hunter AI; proposes HunterAction only
  autopilot.ts     — survivor autopilot
  types.ts / constants.ts / initialState.ts / scoring.ts / narration.ts

src/context/       — React state + round orchestration (MEDIUM risk)
src/screens/       — screen components (MEDIUM risk)
src/components/    — UI components (MEDIUM/LOW risk)
src/sound/         — Web Audio, no file assets (LOW risk)

tests/             — Vitest unit + simulation tests
```

**Key rules:**
- `src/game/engine.ts` is the sole source of truth for legality and state transitions.
- `hunterAI.ts` returns a `HunterAction`; the engine validates it and falls back to patrol if invalid. AI/LLM must never mutate state directly.
- All engine functions are pure: `(state, input) → newState`. No mutation.
- Illegal actions must be rejected or fallen-back, never silently accepted.

---

## Mobile-first rules

- **375 px minimum width** must remain usable.
- No hover-only interactions (touch devices have none).
- Touch targets ≥ 44 × 44 px.
- Text must be short: event cards ≤ 2 lines, button labels ≤ 3 words.
- Test at 375 px before marking UI work done.

---

## Required before marking any task complete

```bash
npm test        # all tests pass
npm run build   # clean production bundle
```

For engine changes, also run the simulation:

```bash
npm run audit:playtest
```

---

## Output format

End every session with:

1. **Files changed** — list only files actually modified.
2. **Commands run** — with pass/fail.
3. **Known limitations** — be honest about what was not done.
4. No unified diffs in responses.
5. No emoji in code or docs unless already present in the file.

---

## Risk levels (see WORKFLOW.md for full protocol)

| Level | Scope |
|-------|-------|
| LOW | CSS, copy, README |
| MEDIUM | UI components, screen logic, context wiring |
| HIGH | `src/game/*`, win conditions, scoring |
| BLOCKED | Discord, payments, backend, real LLM, major mode changes |

---

## Where to go for depth

| Topic | File |
|-------|------|
| Workflow steps | `docs/harness/WORKFLOW.md` |
| Acceptance criteria | `docs/harness/ACCEPTANCE_CRITERIA.md` |
| Game feel rubric | `docs/harness/GAME_FEEL_RUBRIC.md` |
| Playtest audit template | `docs/harness/PLAYTEST_AUDIT_TEMPLATE.md` |
| Discord gate | `docs/harness/DISCORD_GATE.md` |
| Prompt templates | `docs/harness/PROMPTS.md` |
