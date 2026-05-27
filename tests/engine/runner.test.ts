import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseBashContent } from "../../src/parsers/bash.js";
import { executeRun } from "../../src/engine/runner.js";
import type { SshClient, SshExecResult } from "../../src/engine/ssh.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("../../src/tui/confirm.js", () => ({
  confirmTask: vi.fn().mockResolvedValue(true),
  setAssumeYes: vi.fn(),
  shouldAssumeYes: vi.fn().mockReturnValue(true),
}));

const fixture = readFileSync(
  join(import.meta.dirname, "../fixtures/sample.scotty.sh"),
  "utf8"
);

function mockSshClient(result: SshExecResult = { stdout: "ok", stderr: "", code: 0 }): () => SshClient {
  return () => ({
    connect: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn().mockResolvedValue(result),
    dispose: vi.fn().mockResolvedValue(undefined),
  });
}

describe("executeRun", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" })
    );
  });

  it("runs macro tasks sequentially with CLI option overrides", async () => {
    const config = parseBashContent(fixture, "scotty.sh");
    const execSpy = vi.fn().mockResolvedValue({ stdout: "", stderr: "", code: 0 });

    const result = await executeRun(config, {
      target: "deploy",
      cliOptions: { env: "staging" },
      dryRun: false,
      sshOps: { retries: 1 },
      createSshClient: () => ({
        connect: vi.fn().mockResolvedValue(undefined),
        exec: execSpy,
        dispose: vi.fn().mockResolvedValue(undefined),
      }),
    });

    expect(result.success).toBe(true);
    expect(execSpy).toHaveBeenCalledTimes(2);

    const firstScript = execSpy.mock.calls[0]![0] as string;
    expect(firstScript).toContain("export env=");
    expect(firstScript).toContain('git pull origin');
  });

  it("fails fast when SSH returns non-zero", async () => {
    const config = parseBashContent(fixture, "scotty.sh");

    const result = await executeRun(config, {
      target: "pullCode",
      cliOptions: { env: "production" },
      createSshClient: mockSshClient({ stdout: "", stderr: "error", code: 1 }),
    });

    expect(result.success).toBe(false);
  });
});
