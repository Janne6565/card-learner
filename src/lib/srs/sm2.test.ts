import { describe, it, expect } from "vitest";
import { sm2, type SrsState, type Rating } from "./sm2";

function makeCard(overrides: Partial<SrsState> = {}): SrsState {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: new Date("2025-01-01"),
    lapses: 0,
    ...overrides,
  };
}

const NOW = new Date("2025-01-01T12:00:00Z");

function daysFromNow(state: SrsState): number {
  return Math.round(
    (state.dueAt.getTime() - NOW.getTime()) / (24 * 60 * 60 * 1000),
  );
}

describe("SM-2 algorithm", () => {
  describe("new card with Good rating chain", () => {
    it("first Good → 1 day interval", () => {
      const card = makeCard();
      const result = sm2(card, 3, NOW);
      expect(result.intervalDays).toBe(1);
      expect(result.repetitions).toBe(1);
      expect(result.easeFactor).toBe(2.5);
      expect(daysFromNow(result)).toBe(1);
    });

    it("second Good → 6 day interval", () => {
      const card = makeCard({ repetitions: 1, intervalDays: 1 });
      const result = sm2(card, 3, NOW);
      expect(result.intervalDays).toBe(6);
      expect(result.repetitions).toBe(2);
    });

    it("third Good → round(6 * 2.5) = 15 days", () => {
      const card = makeCard({ repetitions: 2, intervalDays: 6 });
      const result = sm2(card, 3, NOW);
      expect(result.intervalDays).toBe(15);
      expect(result.repetitions).toBe(3);
    });

    it("fourth Good → round(15 * 2.5) = 38 days", () => {
      const card = makeCard({ repetitions: 3, intervalDays: 15 });
      const result = sm2(card, 3, NOW);
      expect(result.intervalDays).toBe(38);
      expect(result.repetitions).toBe(4);
    });
  });

  describe("Again rating", () => {
    it("resets repetitions and interval, decreases EF, increments lapses", () => {
      const card = makeCard({ repetitions: 3, intervalDays: 15, easeFactor: 2.5, lapses: 0 });
      const result = sm2(card, 1, NOW);
      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBe(2.3);
      expect(result.lapses).toBe(1);
    });

    it("EF does not go below 1.3", () => {
      const card = makeCard({ easeFactor: 1.35 });
      const result = sm2(card, 1, NOW);
      expect(result.easeFactor).toBe(1.3);
    });
  });

  describe("Hard rating", () => {
    it("interval = max(1, round(prev * 1.2)), EF -= 0.15", () => {
      const card = makeCard({ repetitions: 2, intervalDays: 6, easeFactor: 2.5 });
      const result = sm2(card, 2, NOW);
      expect(result.intervalDays).toBe(7); // round(6 * 1.2) = 7
      expect(result.easeFactor).toBe(2.35);
      expect(result.repetitions).toBe(3);
    });

    it("interval is at least 1 day for new cards", () => {
      const card = makeCard({ repetitions: 0, intervalDays: 0 });
      const result = sm2(card, 2, NOW);
      expect(result.intervalDays).toBe(1);
    });
  });

  describe("Easy rating", () => {
    it("new card → 4 day interval, EF += 0.15", () => {
      const card = makeCard({ repetitions: 0, intervalDays: 0 });
      const result = sm2(card, 4, NOW);
      expect(result.intervalDays).toBe(4);
      expect(result.easeFactor).toBe(2.65);
      expect(result.repetitions).toBe(1);
    });

    it("mature card → round(prev * EF * 1.3)", () => {
      const card = makeCard({ repetitions: 2, intervalDays: 6, easeFactor: 2.5 });
      const result = sm2(card, 4, NOW);
      expect(result.intervalDays).toBe(20); // round(6 * 2.5 * 1.3) = 20
      expect(result.easeFactor).toBe(2.65);
    });
  });

  describe("due date calculation", () => {
    it("dueAt is now + intervalDays", () => {
      const card = makeCard();
      const result = sm2(card, 3, NOW);
      const expectedDue = new Date(NOW.getTime() + 1 * 24 * 60 * 60 * 1000);
      expect(result.dueAt.getTime()).toBe(expectedDue.getTime());
    });
  });
});
