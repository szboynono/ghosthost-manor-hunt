# Development Workflow

## The 6 steps

### 1. Orient
Read `CLAUDE.md`. Read any relevant docs in `docs/harness/`. Read the files you expect to touch. Understand the risk level of the task before writing a single line.

### 2. Write an implementation contract
Before editing, write a short contract (can be in the response, no file needed):

- **What I'm changing** — 1–3 sentences.
- **Files I'll touch** — explicit list.
- **Risk level** — LOW / MEDIUM / HIGH / BLOCKED.
- **What I will not do** — hard boundary to prevent scope creep.
- **Acceptance test** — how you'll know it worked.

If the task is BLOCKED, stop and explain why. Do not attempt workarounds.

### 3. Identify risk
| Level | Scope | Additional gate |
|-------|-------|-----------------|
| LOW | CSS, copy, README | None |
| MEDIUM | UI state flow, components, screen logic, context wiring | Confirm no engine changes snuck in |
| HIGH | `src/game/*` — engine, AI, scoring, win conditions | Write/update Vitest tests first; run simulation audit after |
| BLOCKED | Discord, payments, backend, multiplayer arch, real LLM API, major gameplay mode | Stop — requires separate contract + human approval |

### 4. Implement narrowly
- Change only the files listed in your contract.
- Do not clean up unrelated code.
- Do not add features not in the contract.
- Do not add logging, comments, or explanatory code unless the WHY is non-obvious.

### 5. Verify

```bash
npm test          # must pass — always
npm run build     # must pass — always
```

For HIGH risk (engine changes):
```bash
npm run audit:playtest   # balance must remain within acceptable range
```

For UI changes: manually confirm 375 px layout is usable.

### 6. Report
End with:
- Files changed (list only actual changes).
- Commands run with pass/fail.
- Known limitations — be honest about gaps.
- Recommended next prompt if relevant.

No diffs. No summaries of what code does. No "I also noticed..." tangents — open a separate task.
