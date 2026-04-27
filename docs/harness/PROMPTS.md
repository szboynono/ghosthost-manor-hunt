# Reusable Prompt Templates

Paste these into Claude Code to kick off specific work types. Fill in the bracketed sections.

---

## Feature implementation contract

```
You are Claude Code working on GhostHost: Manor Hunt.

Read CLAUDE.md and docs/harness/WORKFLOW.md before starting.

Task: [describe the feature in 1–2 sentences]

Implementation contract:
- Risk level: [LOW / MEDIUM / HIGH]
- Files to touch: [list files]
- What I will not do: [hard boundary]
- Acceptance test: [how to know it worked]

Constraints:
- No Discord, backend, LLM, or multiplayer code.
- Keep mobile 375 px layout usable.
- npm test and npm run build must pass when done.
- Output format: files changed, commands run, known limitations.
```

---

## Game-feel polish pass

```
You are Claude Code acting as a senior game feel engineer on GhostHost: Manor Hunt.

Read CLAUDE.md and docs/harness/GAME_FEEL_RUBRIC.md before starting.

Target improvement: [e.g. "Hunter presence feels weak — players forget The Warden exists between encounters"]

Rubric dimensions to improve: [list 1–3 from the rubric]
Current scores: [e.g. Hunter presence: 3, Tension: 3]
Target scores: [e.g. Hunter presence: 4, Tension: 4]

Constraints:
- No engine changes unless LOW risk (CSS/animation only).
- Touch targets ≥ 44 × 44 px.
- Event card text ≤ 2 lines.
- npm test and npm run build must pass.
- Do NOT add Discord, backend, or LLM integration.
```

---

## Engine change with tests

```
You are Claude Code making a HIGH-risk engine change on GhostHost: Manor Hunt.

Read CLAUDE.md, docs/harness/WORKFLOW.md, and docs/harness/ACCEPTANCE_CRITERIA.md first.

Change: [describe the engine change]
Motivation: [why — what failure state or imbalance prompted this]

Required:
1. Write Vitest test(s) for the new behavior first.
2. Implement the change.
3. Run npm test (all must pass).
4. Run npm run audit:playtest.
5. Report survivor/hunter win rate before and after.
6. If win rate shifts > 5 pp, update PLAYTEST_AUDIT.md.

Constraints:
- Pure functions only. No mutation.
- Illegal actions must be rejected/fallen-back.
- Do not touch UI files unless strictly necessary.
```

---

## Playtest audit

```
You are Claude Code running a playtest audit on GhostHost: Manor Hunt.

Run:
  npm run audit:playtest

Collect:
- Survivor win rate
- Hunter win rate
- Timeouts
- Average game length
- Action usage distributions
- Chase outcomes

Fill in docs/harness/PLAYTEST_AUDIT_TEMPLATE.md with results.
Save the filled template as PLAYTEST_AUDIT_v[version].md in the repo root.

Also score the game-feel rubric (docs/harness/GAME_FEEL_RUBRIC.md) based on simulation data.

End with a KEEP / TUNE / REWORK / STOP verdict and 2–3 specific recommended changes.
```

---

## Visual QA pass

```
You are Claude Code doing a visual QA pass on GhostHost: Manor Hunt.

Start the dev server (npm run dev) and manually verify:

1. Main Menu loads cleanly.
2. Lobby → Role Reveal → Game Board flow works.
3. At 375 px: no overflow, all buttons tappable, map readable.
4. Chase modal appears and resolves.
5. Event card appears after each round and dismisses.
6. Result screen shows correct winner, stats, and awards.

Check each animation:
- [ ] Heartbeat pulses at correct speed for calm/uneasy/racing/panicking.
- [ ] Fear bar glows red at high fear.
- [ ] Repair flash fires when machine hits 100%.
- [ ] Gate ring fires when gate opens.
- [ ] Captured token shakes.
- [ ] Danger rooms pulse more urgently at fog level ≥ 3.
- [ ] Action buttons show description and noise badge.

Report: what passed, what broke, screenshot path if available.
Do not fix bugs in this session — list them as recommendations.
```

---

## Discord Activity readiness review

```
You are Claude Code reviewing whether GhostHost: Manor Hunt is ready to open the Discord integration gate.

Read docs/harness/DISCORD_GATE.md.

Check each gate item:
1. Is the full game loop playable end-to-end?
2. Does any PLAYTEST_AUDIT file have a KEEP or TUNE verdict?
3. Do npm test and npm run build pass?
4. Is the 375 px layout verified?
5. Is a demo/recording available?
6. Is game state JSON-serializable with no circular refs?
7. Is GameContext round orchestration cleanly separated from rendering?

Report status of each item. Do not implement Discord integration — just assess readiness and list gaps.
```
