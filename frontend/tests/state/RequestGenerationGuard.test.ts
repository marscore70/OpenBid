import { describe, expect, it } from "vitest";
import { createRequestGenerationGuard } from "../../src/state/RequestGenerationGuard";

describe("RequestGenerationGuard", () => {
  it("reports the first generation as latest for a key with no prior requests", () => {
    const guard = createRequestGenerationGuard<string>();
    const generation = guard.next("a1");
    expect(guard.isLatest("a1", generation)).toBe(true);
  });

  it("invalidates an older generation once a newer request starts for the same key", () => {
    const guard = createRequestGenerationGuard<string>();
    const first = guard.next("a1");
    const second = guard.next("a1");

    expect(guard.isLatest("a1", first)).toBe(false);
    expect(guard.isLatest("a1", second)).toBe(true);
  });

  it("tracks generations independently per key", () => {
    const guard = createRequestGenerationGuard<string>();
    guard.next("a1");
    const latestA1 = guard.next("a1");
    const latestA2 = guard.next("a2");

    expect(guard.isLatest("a1", latestA1)).toBe(true);
    expect(guard.isLatest("a2", latestA2)).toBe(true);
    // Same generation number, but keys are independent: a1's first
    // generation (1) must not be confused with a2's only generation (1).
    expect(guard.isLatest("a1", 1)).toBe(false);
    expect(guard.isLatest("a2", 1)).toBe(true);
  });

  it("reports false for a generation of a key that never started a request", () => {
    const guard = createRequestGenerationGuard<string>();
    expect(guard.isLatest("missing", 1)).toBe(false);
  });
});
