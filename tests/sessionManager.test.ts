import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager } from "../server/sessionManager";

let mgr: SessionManager;
beforeEach(() => { mgr = new SessionManager(); });

// ── join ────────────────────────────────────────────────────────────────────

describe("SessionManager.join", () => {
  it("assigns p1 to the first joining client", () => {
    const r = mgr.join("room1", "c1", "Alice", null);
    expect(r.assignedPlayerId).toBe("p1");
  });

  it("marks the first client as host", () => {
    const r = mgr.join("room1", "c1", "Alice", null);
    expect(r.isHost).toBe(true);
  });

  it("assigns p2 to the second client in the same instance", () => {
    mgr.join("room1", "c1", "Alice", null);
    const r = mgr.join("room1", "c2", "Bob", null);
    expect(r.assignedPlayerId).toBe("p2");
    expect(r.isHost).toBe(false);
  });

  it("assigns p1–p4 in join order", () => {
    const slots = ["p1", "p2", "p3", "p4"];
    for (let i = 0; i < 4; i++) {
      const r = mgr.join("room1", `c${i}`, `P${i}`, null);
      expect(r.assignedPlayerId).toBe(slots[i]);
    }
  });

  it("returns null assignedPlayerId (spectator) for 5th client", () => {
    for (let i = 0; i < 4; i++) mgr.join("room1", `c${i}`, `P${i}`, null);
    const r = mgr.join("room1", "c4", "Extra", null);
    expect(r.assignedPlayerId).toBeNull();
    expect(r.isHost).toBe(false);
  });

  it("treats separate instanceIds as independent", () => {
    const r1 = mgr.join("room1", "c1", "Alice", null);
    const r2 = mgr.join("room2", "c2", "Bob", null);
    expect(r1.assignedPlayerId).toBe("p1");
    expect(r2.assignedPlayerId).toBe("p1");
    expect(r1.isHost).toBe(true);
    expect(r2.isHost).toBe(true);
  });
});

// ── leave ───────────────────────────────────────────────────────────────────

describe("SessionManager.leave", () => {
  it("frees the slot so a new client can take it", () => {
    mgr.join("room1", "c1", "Alice", null);
    mgr.join("room1", "c2", "Bob", null);
    mgr.leave("c1");
    const r = mgr.join("room1", "c3", "Carol", null);
    expect(r.assignedPlayerId).toBe("p1");
  });

  it("returns null for an unknown clientId", () => {
    expect(mgr.leave("ghost")).toBeNull();
  });

  it("reassigns host to next player when host leaves", () => {
    mgr.join("room1", "c1", "Alice", null);
    mgr.join("room1", "c2", "Bob", null);
    const result = mgr.leave("c1");
    expect(result?.newHostClientId).toBe("c2");
    expect(mgr.getHostClientId("room1")).toBe("c2");
  });

  it("returns remaining clientIds after leave", () => {
    mgr.join("room1", "c1", "Alice", null);
    mgr.join("room1", "c2", "Bob", null);
    const result = mgr.leave("c1");
    expect(result?.remainingClientIds).toEqual(["c2"]);
  });

  it("cleans up instance when last client leaves", () => {
    mgr.join("room1", "c1", "Alice", null);
    mgr.leave("c1");
    expect(mgr.getInstanceClients("room1")).toHaveLength(0);
  });
});

// ── setReady ─────────────────────────────────────────────────────────────────

describe("SessionManager.setReady", () => {
  it("marks the client ready and returns instance clientIds", () => {
    mgr.join("room1", "c1", "Alice", null);
    mgr.join("room1", "c2", "Bob", null);
    const result = mgr.setReady("c1", true);
    expect(result?.clientIds).toContain("c1");
    expect(result?.clientIds).toContain("c2");
    const slots = mgr.getLobbySlots("room1");
    expect(slots.find(s => s.clientId === "c1")?.ready).toBe(true);
    expect(slots.find(s => s.clientId === "c2")?.ready).toBe(false);
  });

  it("returns null for unknown clientId", () => {
    expect(mgr.setReady("ghost", true)).toBeNull();
  });
});

// ── beginHunt ────────────────────────────────────────────────────────────────

describe("SessionManager.beginHunt", () => {
  it("increments huntSignal and returns all clientIds", () => {
    mgr.join("room1", "c1", "Alice", null);
    mgr.join("room1", "c2", "Bob", null);
    const result = mgr.beginHunt("c1");
    expect(result?.signal).toBe(1);
    expect(result?.clientIds).toContain("c1");
    expect(result?.clientIds).toContain("c2");
  });

  it("increments monotonically on repeated calls", () => {
    mgr.join("room1", "c1", "Alice", null);
    mgr.beginHunt("c1");
    const result = mgr.beginHunt("c1");
    expect(result?.signal).toBe(2);
  });

  it("returns null when a non-host calls beginHunt", () => {
    mgr.join("room1", "c1", "Alice", null);
    mgr.join("room1", "c2", "Bob", null);
    expect(mgr.beginHunt("c2")).toBeNull();
  });

  it("returns null for unknown clientId", () => {
    expect(mgr.beginHunt("ghost")).toBeNull();
  });
});

// ── getLobbySlots ─────────────────────────────────────────────────────────────

describe("SessionManager.getLobbySlots", () => {
  it("returns slots in p1–p4 order", () => {
    mgr.join("room1", "c1", "Alice", null);
    mgr.join("room1", "c2", "Bob", null);
    const slots = mgr.getLobbySlots("room1");
    expect(slots[0].playerId).toBe("p1");
    expect(slots[1].playerId).toBe("p2");
  });

  it("excludes spectator slots from lobby", () => {
    for (let i = 0; i < 5; i++) mgr.join("room1", `c${i}`, `P${i}`, null);
    const slots = mgr.getLobbySlots("room1");
    expect(slots).toHaveLength(4);
  });

  it("includes displayName and avatarUrl from join args", () => {
    mgr.join("room1", "c1", "Alice", "https://cdn.example.com/avatar.png");
    const slots = mgr.getLobbySlots("room1");
    expect(slots[0].displayName).toBe("Alice");
    expect(slots[0].avatarUrl).toBe("https://cdn.example.com/avatar.png");
  });

  it("returns empty array for unknown instanceId", () => {
    expect(mgr.getLobbySlots("nope")).toEqual([]);
  });
});
