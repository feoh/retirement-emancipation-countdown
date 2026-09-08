import { describe, expect, it } from "vitest";
import { shouldReduceMotion } from "./RetirementCelebration";

describe("shouldReduceMotion", () => {
  it("follows the system preference by default", () => {
    expect(shouldReduceMotion("system", true)).toBe(true);
    expect(shouldReduceMotion("system", false)).toBe(false);
  });

  it("allows either explicit override", () => {
    expect(shouldReduceMotion("always", false)).toBe(true);
    expect(shouldReduceMotion("never", true)).toBe(false);
  });
});
