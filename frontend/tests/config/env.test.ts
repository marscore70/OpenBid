import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "../../src/config/env";

describe("resolveApiBaseUrl", () => {
  it("returns the local mock default in non-production when env is unset", () => {
    expect(resolveApiBaseUrl({ prod: false, viteApiBaseUrl: undefined })).toBe(
      "http://localhost:3005",
    );
  });

  it("uses an explicit non-prod override when provided", () => {
    expect(
      resolveApiBaseUrl({
        prod: false,
        viteApiBaseUrl: "http://127.0.0.1:4000/",
      }),
    ).toBe("http://127.0.0.1:4000");
  });

  it("throws in production when the env var was never set at build time", () => {
    expect(() =>
      resolveApiBaseUrl({ prod: true, viteApiBaseUrl: undefined }),
    ).toThrow(Error);
  });

  it("allows an empty production value for same-origin nginx proxying", () => {
    expect(resolveApiBaseUrl({ prod: true, viteApiBaseUrl: "" })).toBe("");
    expect(resolveApiBaseUrl({ prod: true, viteApiBaseUrl: "   " })).toBe("");
  });

  it("rejects non-local HTTP in production", () => {
    expect(() =>
      resolveApiBaseUrl({
        prod: true,
        viteApiBaseUrl: "http://api.example.com",
      }),
    ).toThrow(Error);
  });

  it("accepts HTTPS production origins", () => {
    expect(
      resolveApiBaseUrl({
        prod: true,
        viteApiBaseUrl: "https://api.example.com/",
      }),
    ).toBe("https://api.example.com");
  });

  it("accepts local HTTP in production for local container smoke tests", () => {
    expect(
      resolveApiBaseUrl({
        prod: true,
        viteApiBaseUrl: "http://localhost:3005",
      }),
    ).toBe("http://localhost:3005");
  });
});
