# Acceptance Criteria

## Always required

- [ ] `npm test` passes with 0 failures.
- [ ] `npm run build` produces a clean bundle with 0 TypeScript errors.
- [ ] Mobile layout works at 375 px width (no overflow, no broken touch targets).
- [ ] No new walls of text: event card text ≤ 2 lines, button labels ≤ 3 words.
- [ ] No accidental Discord, backend, LLM, or multiplayer code introduced.

---

## For engine changes (`src/game/*`)

- [ ] New Vitest test(s) cover the change. Tests are written before or alongside implementation.
- [ ] All engine functions remain pure: `(state, input) → newState`. No mutation.
- [ ] Illegal actions are validated and rejected or fallen back — never silently accepted.
- [ ] Run `npm run audit:playtest`. Survivor win rate must stay in **40–60%** range unless the change intentionally rebalances.
- [ ] If balance shifts >5 pp, update `PLAYTEST_AUDIT.md` with new numbers.

---

## For UI / game-feel changes

- [ ] State clearly which player-facing tension or readability problem is being solved.
- [ ] Touch targets are ≥ 44 × 44 px for any new interactive element.
- [ ] Check the game-feel rubric (`GAME_FEEL_RUBRIC.md`) — net score must not regress.
- [ ] Event card text stays short (≤ 2 lines, ≤ ~80 chars per line).
- [ ] Animations complete within 1 s. No looping animations that obscure information.

---

## For Hunter AI changes (`src/game/hunterAI.ts`)

- [ ] Output remains a valid `HunterAction` union type — engine validates legality.
- [ ] Engine fallback path is exercised by an existing test (`isHunterActionValid`).
- [ ] The Warden must feel smart but not omniscient: 30–40% random-variance threshold maintained.
- [ ] Playtest audit run after change. Hunter win rate must not exceed 65%.

---

## For narration / event card changes

- [ ] All text pools have ≥ 3 entries (variety).
- [ ] Text fits 2 lines on a 375 px screen at 13–14 px font.
- [ ] Priority chain (eliminated > captured > … > ambient) is preserved.

---

## For Discord integration (currently BLOCKED)

- [ ] Separate gate checklist in `DISCORD_GATE.md` must be fully satisfied first.
- [ ] Requires explicit human approval and a separate implementation contract.
- [ ] No Discord SDK imports or env vars may appear in the codebase before this gate is open.
