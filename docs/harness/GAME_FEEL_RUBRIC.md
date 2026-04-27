# Game Feel Rubric

Score each dimension 1–5. A change that improves any score without regressing others is good. A change that drops any score below 3 needs justification.

---

## Dimensions

| # | Dimension | 1 (bad) | 3 (ok) | 5 (great) |
|---|-----------|---------|--------|-----------|
| 1 | **Mobile readability** | Text overflows or is tiny | Readable but crowded | Clean at 375 px, nothing hidden |
| 2 | **Board clarity** | Can't tell where Hunter is or what rooms mean | Most info visible | Room danger, player positions, machine progress all clear at a glance |
| 3 | **Hunter presence** | Warden feels absent or harmless | Occasional threat | Every round you feel watched — fog, heartbeat, alerts do their job |
| 4 | **Tension** | Never unsure what to do | Occasional hard choices | "Do I risk one more turn repairing or hide now?" is a real dilemma |
| 5 | **Action clarity** | Players don't know what actions do | Labels are clear | Label + description + noise icon — player understands cost and benefit instantly |
| 6 | **Feedback juice** | Actions feel silent — nothing happens | Some animations | Repair flash, gate ring, capture shake, heartbeat pulse — events feel physical |
| 7 | **Round pacing** | Either too fast to read or too slow | Medium | Event card appears → player reads → dismisses → acts. Rhythm is natural |
| 8 | **Replay desire** | One game is enough | Would play again once | "One more game" impulse. Roles feel different. Outcomes surprise |
| 9 | **Not-a-bot feel** | Feels like filling out a form | Has some personality | The manor feels alive; the Warden feels like a character, not a state machine |

---

## Failure examples (hard veto)

These patterns immediately fail the rubric regardless of score:

- **Too much text:** Event card > 2 lines, or action description > 1 short sentence.
- **Tiny buttons:** Any interactive element < 44 × 44 px on mobile.
- **Unclear danger:** Player cannot tell which rooms are dangerous without reading status text.
- **Random Hunter:** The Warden moves or acts with no discernible logic — players feel cheated, not scared.
- **Opaque loss:** Player reaches result screen without understanding why they lost.
- **Form feel:** Survivors choose actions by typing, selecting from dropdowns, or filling fields.
- **Text adventure feel:** Narration substitutes for visual map information.

---

## How to use this rubric

When proposing a UI or game-feel change:

1. State the current score for affected dimensions.
2. State the expected score after the change.
3. Explain what specifically drives the improvement.
4. If any dimension would drop, justify why the trade is worth it.

You do not need to score every dimension on every task. Score only the ones the change affects.

---

## v0.1 baseline scores (post-polish)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Mobile readability | 4 | Clean at 375 px; action panel slightly crowded with descriptions |
| Board clarity | 3 | Room positions clear; machine progress visible; danger fog works |
| Hunter presence | 3 | Heartbeat/fog clues land; Warden still invisible unless debug mode |
| Tension | 3 | Chase encounter and capture countdown create real urgency |
| Action clarity | 4 | Labels + descriptions + noise badge added in polish pass |
| Feedback juice | 4 | Repair flash, gate ring, capture shake, variable heartbeat pulse |
| Round pacing | 3 | Event card rhythm works; dismissing and repeating feels natural |
| Replay desire | 3 | Role differentiation mild; autopilot partners reduce agency |
| Not-a-bot feel | 3 | Manor text is good; Warden still anonymous |
