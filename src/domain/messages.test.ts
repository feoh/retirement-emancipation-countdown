import { describe, expect, it } from "vitest";
import { MESSAGE_CATALOG_SIZE, messageForDay } from "./messages";

function dateKey(dayOffset: number): string {
  const date = new Date(Date.UTC(2030, 0, 1 + dayOffset));
  return date.toISOString().slice(0, 10);
}

describe("messageForDay", () => {
  it("is deterministic for the same local date", () => {
    expect(messageForDay("2030-06-15", false)).toBe(
      messageForDay("2030-06-15", false),
    );
  });

  it.each([
    [false, MESSAGE_CATALOG_SIZE.countdown],
    [true, MESSAGE_CATALOG_SIZE.retired],
  ])("rotates through the whole pool before repeating", (retired, poolSize) => {
    const cycle = Array.from({ length: poolSize }, (_, index) =>
      messageForDay(dateKey(index), retired),
    );
    expect(new Set(cycle)).toHaveLength(poolSize);
    expect(messageForDay(dateKey(poolSize), retired)).toBe(cycle[0]);
  });

  it("uses a separate retired catalog", () => {
    expect(messageForDay("2030-06-15", true)).not.toBe(
      messageForDay("2030-06-15", false),
    );
  });

  it("provides a neutral fallback for an invalid date", () => {
    expect(messageForDay("not-a-date", false)).toBe(
      "One day at a time. You are on your way.",
    );
    expect(messageForDay("2030-02-30", true)).toBe(
      "One day at a time. You are on your way.",
    );
  });
});
