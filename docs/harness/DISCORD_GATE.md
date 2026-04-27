# Discord Integration Gate

Discord work is **blocked** until every item below is checked.

Do not add Discord SDK imports, Discord env vars, or any Discord-specific code to the codebase while items remain unchecked.

---

## Gate checklist

### Playability
- [ ] Full game loop is playable from Main Menu → Lobby → Role Reveal → Game Board → Result Screen without crashes or dead ends.
- [ ] At least one `PLAYTEST_AUDIT_*.md` verdict is **KEEP** or **TUNE** (not REWORK or STOP).
- [ ] `npm test` passes cleanly.
- [ ] `npm run build` produces a clean bundle.

### Mobile baseline
- [ ] Manual 375 px layout check passes: no overflow, no broken touch targets, event cards readable.

### Demo / recording
- [ ] A screen recording or demo link exists showing the full game loop, OR a demo/recording mode is implemented.

### State model stability
- [ ] Game state is serializable (JSON-round-trippable) with no circular references.
- [ ] Round orchestration in `GameContext` is clearly separated from rendering — suitable for future network tick injection.
- [ ] No React state is used for game logic that would need to sync across clients.

---

## When the gate opens

First integration steps only:

1. **Discord Activity shell** — wrap the Vite app in the Discord Embedded App SDK. No gameplay changes.
2. **Discord identity injection** — map Discord user IDs to player slots. Replace `isControlled: index === 0` with Discord user → slot assignment.
3. **Simple session join** — lobby URL or invite code to share a game session.
4. **Bot for launch/invite/recap** — slash command to create a game, post a recap to the channel after the game ends.

---

## Explicitly blocked in first Discord integration

- Payments or premium features.
- Public App Directory listing.
- Complex matchmaking or ranked play.
- Real LLM API calls (inference costs during gameplay).
- Full multiplayer with late-join, reconnect, or spectator.

---

## Notes on architecture

The engine is already suitable for Discord integration:
- Pure functions — safe to call on any client or server.
- `HunterAction` interface is the seam for replacing heuristic AI with a Discord Bot message.
- State is a plain object — serializable over WebSocket or REST.

When multiplayer is needed, the minimal backend is:
- One authoritative game state per session.
- Clients send `SurvivorAction` intents; server runs the engine turn; broadcasts new state.
- No shared mutable state in client React.
