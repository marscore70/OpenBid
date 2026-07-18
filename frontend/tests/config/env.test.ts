import { describe, expect, it } from "vitest";
import { getApiBaseUrl } from "../../src/config/env";

describe("getApiBaseUrl", () => {
  it("returns the local mock default in non-production when env is unset", () => {
    expect(getApiBaseUrl()).toBe("http://localhost:3005");
  });
});
