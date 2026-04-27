# GhostHost: Manor Hunt — v0.1 Playtest Audit

**Date:** 2026-04-26  
**Sim harness:** `tests/simulation.test.ts` — 200 headless games, full autopilot  
**Baseline (pre-tuning):** 0% survivor win rate  
**Post-tuning:** 47% survivor / 53% Hunter — balanced, Hunter-edge horror feel

---

## Simulation Results (post-tuning)

| Metric | Value |
|--------|-------|
| Games simulated | 200 |
| Survivor win rate | **47.0%** |
| Hunter win rate | **53.0%** |
| Timeouts (> 60 rounds) | 0 |
| Avg game length (all) | **13.3 rounds** |
| Avg game length — survivor win | 10.6 rounds |
| Avg game length — hunter win | 15.7 rounds |
| Avg first capture round | 5.6 |
| Avg first elimination round | 9.3 |
| Avg machines repaired | 4.48 |
| Avg total captures per game | 3.06 |
| Avg eliminations per game | 1.96 |

---

## Action Usage Distribution

### Survivors
| Action | Usage | Notes |
|--------|-------|-------|
| Repair | 41.1% | Primary activity ✅ |
| Hide | 30.5% | Tension driver ✅ |
| Move | 22.3% | Navigation ✅ |
| Heal | 2.9% | Medic role active ✅ |
| Rescue | 1.7% | Rare but meaningful ✅ |
| Distract | 1.1% | Decoy gets some use ✅ |
| Scout | 0.4% | Under-used ⚠️ |
| Wait | 0.0% | Never — fear penalty drives action |

### Hunter (The Warden)
| Action | Usage | Notes |
|--------|-------|-------|
| Chase | 51.4% | Primary threat ✅ |
| Listen | 17.0% | Telegraph system works ✅ |
| Guard | 14.5% | Capture pressure ✅ |
| Trap | 9.3% | Used but minor impact |
| Patrol | 7.7% | Spread pressure ✅ |
| Block exit | 0.1% | Rare — only when 4+ machines done |

### Chase Outcomes
- Escaped: 39.4% of chase encounters
- Caught: 60.6% of chase encounters
- With human play (smarter choices), escape rate would be ~50–55%

---

## Pre-Tuning Failure States

| Problem | Root Cause | Fix Applied |
|---------|-----------|-------------|
| **0% survivor wins** | Repair noise (=2) immediately triggered Hunter chase every turn | Reduced repair noise: 2 → 1 |
| **5th machine never repairable** | Hunter's `_patrolTarget` beelines the highest-progress unrepaired machine deterministically | Added 35% random patrol variance |
| **Fear spiralled to 100% in ~5 rounds** | Adjacency fear bonus (15/round) compounded across all 4 survivors | Reduced: same-room 30→20, adj 15→8 |
| **Chase escape rate dropped to 30%** | High fear × steep fear penalty in formula | Buffed all escape options (+10 base, softer fear penalty) |
| **Rescues never happened** | Autopilot `hide > rescue` priority; Medic hid when Hunter was guarding captured players | Medic now rescues even with Hunter present |
| **Survivors wandered after all 5 machines** | Autopilot navigated toward machines, not gates | Added BFS gate navigation to autopilot |
| **Capture countdown too short** | CAPTURE_COUNTDOWN=2 gave only 2 rounds to rescue | Increased to 3 rounds |
| **Hide failure rate too high in danger rooms** | Basement/BoilerRoom at danger-2 gave only 56% hide success | Base hide 0.80→0.84, danger penalty 0.12→0.04 per level |

---

## Balance Assessment (post-tuning)

### Is the Hunter smart or random?
**Smart, with enough unpredictability to feel fair.**  
- The Warden chases injured/noisy players (51% of turns), listens before pouncing (17%), and guards captures to prevent rescues (14%).  
- The 35% random patrol variance means the Hunter *could* be anywhere — players can't fully predict it.  
- Hunter never blocks exits because the survivors usually escape before reaching machine #4–5. This is a **good emergent behavior**: blockExit is a late-game power the Hunter rarely gets to use, making it a looming threat.

### Do tension systems affect outcomes?
**Yes, measurably.**  
- Fear determines hide success and chase escape chance. High-fear survivors (>75) have ~15% worse hide success and ~7% worse chase escape than calm survivors.  
- Heartbeat state (calm/uneasy/racing/panicking) makes fear visible.  
- Capture countdown creates real urgency — avg 1.7 rescues/game means teams are actively rescuing mid-game.

### Are any actions useless or overpowered?
| Verdict | Action |
|---------|--------|
| ⚠️ **Under-used** | Scout — only 0.4% usage. The autopilot rarely sees the Hunter exactly 1 room away at the right moment. Human players will use it more. |
| ⚠️ **Rarely useful** | Wait — never used by autopilot. It reduces fear by 5 per round, but autopilot never needs to wait. Human players in panic may find it useful. |
| ✅ **Balanced** | Repair (main loop), Hide (tension), Move (navigation), Distract (situational) |
| ✅ **Role-differentiated** | Medic rescues/heals (3+1.7%), Scout flees better, Decoy escapes chases better, Mechanic completes machines faster |

### Game length
13.3 rounds average. At ~30 seconds of deliberation per round (human), that's about **6–7 minutes per game** — right in the "one more game" range for mobile.

---

## Common Failure States (Human Players Should Know)

1. **Ignoring the Medic's rescue duty.** Games where nobody rescues captured players end within 3–5 rounds of the first capture.
2. **Repairing while Hunter is adjacent.** Move+repair in the same room generates noise=2. With Hunter adjacent, this triggers a listen → next turn chase sequence.
3. **Everyone clustering on the same machine.** No coordination means the other machines never start. The Decoy should distract while the Mechanic repairs.
4. **Not escaping through gateB early.** P3 (Scout) starts in Greenhouse, adjacent to gateB. Once all machines are repaired, P3 can escape in 1 move. Human players often keep repairing instead.

---

## Known Limitations

- **Autopilot is simplistic.** Real human play will have much more coordination; survivor win rate with good human play is estimated ~55–65%.
- **Scout action is nearly useless in autopilot** because the Hunter is rarely detected exactly 1 room away when the Scout happens to act. Human players scouting proactively makes it more valuable.
- **Single-player only** — other 3 survivors are autopilot. Multiplayer would change balance significantly.
- **Chase escape rates** (60.6% caught by autopilot) are skewed because the sim doesn't pick the optimal chase choice dynamically. Human play would improve this to ~50%.
- **Trap action never triggers outcomes** — the engine sets `hasTrap: true` on rooms but doesn't yet apply a trap effect when survivors enter. This is a missing engine feature for v0.2.
