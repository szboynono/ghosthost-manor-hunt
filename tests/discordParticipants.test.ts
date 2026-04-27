import { describe, it, expect } from "vitest";
import {
  mapRawToParticipant,
  mapParticipantsToSlots,
  type RawDiscordParticipant,
  type DiscordParticipant,
} from "../src/discord/discordParticipants";

function makeRaw(overrides: Partial<RawDiscordParticipant> = {}): RawDiscordParticipant {
  return {
    id: "111",
    username: "alice",
    discriminator: "0",
    flags: 0,
    bot: false,
    ...overrides,
  };
}

function makeParticipant(id: string): DiscordParticipant {
  return { id, username: id, displayName: id, avatarUrl: null };
}

describe("mapRawToParticipant", () => {
  it("prefers global_name over username", () => {
    const p = mapRawToParticipant(makeRaw({ global_name: "Alice W", username: "alicew" }));
    expect(p.displayName).toBe("Alice W");
  });

  it("falls back to username when global_name is null", () => {
    const p = mapRawToParticipant(makeRaw({ global_name: null }));
    expect(p.displayName).toBe("alice");
  });

  it("falls back to username when global_name is absent", () => {
    const p = mapRawToParticipant(makeRaw({}));
    expect(p.displayName).toBe("alice");
  });

  it("builds avatar URL from hash", () => {
    const p = mapRawToParticipant(makeRaw({ id: "123", avatar: "abc123" }));
    expect(p.avatarUrl).toBe("https://cdn.discordapp.com/avatars/123/abc123.png?size=64");
  });

  it("returns null avatarUrl when avatar is null", () => {
    const p = mapRawToParticipant(makeRaw({ avatar: null }));
    expect(p.avatarUrl).toBeNull();
  });
});

describe("mapParticipantsToSlots", () => {
  it("maps 1 participant to p1 only", () => {
    const slots = mapParticipantsToSlots([makeParticipant("u1")]);
    expect(slots["p1"]?.id).toBe("u1");
    expect(slots["p2"]).toBeUndefined();
    expect(slots["p3"]).toBeUndefined();
    expect(slots["p4"]).toBeUndefined();
  });

  it("maps 4 participants to p1–p4 in join order", () => {
    const slots = mapParticipantsToSlots([
      makeParticipant("u1"), makeParticipant("u2"),
      makeParticipant("u3"), makeParticipant("u4"),
    ]);
    expect(slots["p1"]?.id).toBe("u1");
    expect(slots["p2"]?.id).toBe("u2");
    expect(slots["p3"]?.id).toBe("u3");
    expect(slots["p4"]?.id).toBe("u4");
  });

  it("ignores participants beyond 4", () => {
    const six = Array.from({ length: 6 }, (_, i) => makeParticipant(`u${i}`));
    const slots = mapParticipantsToSlots(six);
    expect(Object.keys(slots)).toHaveLength(4);
  });

  it("empty list produces empty slot map", () => {
    const slots = mapParticipantsToSlots([]);
    expect(Object.keys(slots)).toHaveLength(0);
  });
});
