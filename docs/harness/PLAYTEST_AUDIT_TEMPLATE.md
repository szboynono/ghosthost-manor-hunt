# Playtest Audit Template

Copy this file for each audit. Name it `PLAYTEST_AUDIT_vX.Y.md` or `PLAYTEST_AUDIT_YYYY-MM-DD.md`.

---

## Metadata

| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Commit / branch | |
| Tester | automated / manual / both |
| Commands run | `npm run audit:playtest`, `npm test`, `npm run build` |

---

## Simulation results

| Metric | Value | Target |
|--------|-------|--------|
| Games simulated | | ≥ 100 |
| Survivor win rate | | 40–60% |
| Hunter win rate | | 40–60% |
| Timeouts (> 60 rounds) | | < 5% |
| Avg game length (all) | | 10–18 rounds |
| Avg game length — survivor win | | |
| Avg game length — hunter win | | |
| Avg first capture round | | |
| Avg first elimination round | | |
| Avg machines repaired | | |
| Avg total captures per game | | |
| Avg eliminations per game | | |

---

## Action usage

### Survivors

| Action | Usage % | Notes |
|--------|---------|-------|
| Repair | | Primary activity — should be ~40% |
| Hide | | Should be ~25–35% |
| Move | | Should be ~20–25% |
| Heal | | |
| Rescue | | Low but meaningful |
| Distract | | Situational |
| Scout | | Often under-used by autopilot |
| Wait | | Should be near 0 |

### Hunter

| Action | Usage % | Notes |
|--------|---------|-------|
| Chase | | |
| Listen | | |
| Guard | | |
| Trap | | |
| Patrol | | |
| Block exit | | Late-game only |

### Chase outcomes

- Escaped: __%
- Caught: __%

---

## Failure state analysis

| Failure | Root cause | Severity |
|---------|-----------|----------|
| | | HIGH / MED / LOW |

---

## Useless or overpowered actions

| Verdict | Action | Reason |
|---------|--------|--------|
| Under-used | | |
| Over-powered | | |
| Well-balanced | | |

---

## Hunter behavior notes

Is the Warden smart but not omniscient? Does it:
- [ ] Chase injured/noisy players?
- [ ] Guard captured players (briefly)?
- [ ] React to noise (listen phase)?
- [ ] Patrol unpredictably enough?
- [ ] Block exits late-game?

Notes:

---

## Mobile UX notes

- [ ] 375 px layout tested manually.
- [ ] No overflow or broken touch targets found.
- [ ] Event cards readable.
- [ ] Action panel usable with thumbs.

Notes:

---

## Game feel rubric scores

| Dimension | Score (1–5) | Change from previous |
|-----------|-------------|----------------------|
| Mobile readability | | |
| Board clarity | | |
| Hunter presence | | |
| Tension | | |
| Action clarity | | |
| Feedback juice | | |
| Round pacing | | |
| Replay desire | | |
| Not-a-bot feel | | |

---

## Most common loss reasons (manual observation or autopilot patterns)

1.
2.
3.

---

## Recommended next changes

1.
2.
3.

---

## Verdict

- [ ] **KEEP** — ship as-is, proceed to next feature
- [ ] **TUNE** — balance is close, targeted parameter changes needed
- [ ] **REWORK** — structural problem, needs design change
- [ ] **STOP** — something is fundamentally broken, do not proceed
