import { describe, expect, it } from "vitest";
import { computeTimeRemaining } from "../../../src/domain/auction/computeTimeRemaining";

describe("computeTimeRemaining", () => {
  it("formats mm:ss from endsAt", () => {
    const now = 1_000_000;
    const endsAt = now + 125_000;
    expect(computeTimeRemaining(endsAt, now).formatted).toBe("02:05");
  });

  it("marks expired when past endsAt", () => {
    expect(computeTimeRemaining(500, 1000).expired).toBe(true);
  });

  it("shows at least 00:01 while a fraction of a second remains", () => {
    const result = computeTimeRemaining(1_000_500, 1_000_000);
    expect(result.expired).toBe(false);
    expect(result.formatted).toBe("00:01");
  });
});
