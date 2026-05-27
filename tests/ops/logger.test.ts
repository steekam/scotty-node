import { describe, expect, it, vi, afterEach } from "vitest";
import { redactValue, logEvent } from "../../src/ops/logger.js";

describe("redactValue", () => {
  it("redacts sensitive keys", () => {
    expect(redactValue("smtp_pass", "secret123")).toBe("[REDACTED]");
    expect(redactValue("token", "abc")).toBe("[REDACTED]");
  });
});

describe("logEvent", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("writes JSON to stderr when SCOTTY_LOG_JSON=1", () => {
    vi.stubEnv("SCOTTY_LOG_JSON", "1");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logEvent("test.event", "hello", { task: "deploy" });

    expect(spy).toHaveBeenCalledOnce();
    const line = JSON.parse(String(spy.mock.calls[0]![0]));
    expect(line.event).toBe("test.event");
    expect(line.message).toBe("hello");
    expect(line.task).toBe("deploy");

    spy.mockRestore();
  });
});
