import { describe, expect, it } from "vitest";
import { shouldNotifyOutbidWhenApplied } from "../../../src/features/notifications/shouldNotifyOutbidWhenApplied";

describe("shouldNotifyOutbidWhenApplied", () => {
  it("notifies only when amount was applied and toast is eligible", () => {
    expect(shouldNotifyOutbidWhenApplied(true, true)).toBe(true);
  });

  it("does not notify when merge did not apply the amount", () => {
    expect(shouldNotifyOutbidWhenApplied(false, true)).toBe(false);
  });

  it("does not notify when outbid toast is not eligible", () => {
    expect(shouldNotifyOutbidWhenApplied(true, false)).toBe(false);
  });

  it("does not notify when neither applied nor eligible", () => {
    expect(shouldNotifyOutbidWhenApplied(false, false)).toBe(false);
  });
});
