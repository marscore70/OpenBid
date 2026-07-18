import { describe, expect, it } from "vitest";
import {
  createDefaultDisplayTiming,
  createDisplayTimingRegistry,
} from "../../../src/domain/auction/DisplayTiming";

describe("DisplayTimingRegistry", () => {
  it("returns default timing when auction has no stored entry", () => {
    const registry = createDisplayTimingRegistry();
    const timing = registry.get("missing", 1_700_000_000_000);
    expect(timing).toEqual(
      createDefaultDisplayTiming(1_700_000_000_000),
    );
    expect(timing.snipeExtended).toBe(false);
  });

  it("returns stored readonly timing after set", () => {
    const registry = createDisplayTimingRegistry();
    registry.set("a1", {
      displayEndsAt: 99,
      snipeExtended: true,
    });
    const timing = registry.get("a1", 1);
    expect(timing.displayEndsAt).toBe(99);
    expect(timing.snipeExtended).toBe(true);
  });

  it("returns default again after clear", () => {
    const registry = createDisplayTimingRegistry();
    registry.set("a1", { displayEndsAt: 99, snipeExtended: true });
    registry.clear("a1");
    expect(registry.get("a1", 50)).toEqual(createDefaultDisplayTiming(50));
  });

  it("freezes stored timing so callers cannot mutate registry state", () => {
    const registry = createDisplayTimingRegistry();
    registry.set("a1", { displayEndsAt: 99, snipeExtended: true });
    const timing = registry.get("a1", 1);
    expect(Object.isFrozen(timing)).toBe(true);
  });

  it("isolates timing entries per auction id", () => {
    const registry = createDisplayTimingRegistry();
    registry.set("a1", { displayEndsAt: 10, snipeExtended: true });
    registry.set("a2", { displayEndsAt: 20, snipeExtended: false });
    expect(registry.get("a1", 0).displayEndsAt).toBe(10);
    expect(registry.get("a2", 0).displayEndsAt).toBe(20);
    registry.clear("a1");
    expect(registry.get("a1", 5)).toEqual(createDefaultDisplayTiming(5));
    expect(registry.get("a2", 0).displayEndsAt).toBe(20);
  });
});
