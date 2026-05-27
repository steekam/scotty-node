import { execa } from "execa";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const bin = join(root, "bin/scotty.js");
const e2eFixture = join(root, "tests/fixtures/e2e.scotty.sh");

function withProjectDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "scotty-e2e-"));
  cpSync(e2eFixture, join(dir, "scotty.sh"));
  return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

describe("CLI e2e", () => {
  beforeAll(async () => {
    await execa("pnpm", ["build"], { cwd: root });
  }, 60_000);

  it("doctor exits 0 on valid config", async () => {
    await withProjectDir(async (dir) => {
      const result = await execa("node", [bin, "doctor"], {
        cwd: dir,
        reject: false,
        env: { ...process.env, FORCE_COLOR: "0" },
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("All checks passed");
    });
  }, 30_000);

  it("run macro dry-run completes without SSH", async () => {
    await withProjectDir(async (dir) => {
      const result = await execa(
        "node",
        [bin, "run", "smoke", "--dry-run"],
        {
          cwd: dir,
          reject: false,
          env: { ...process.env, FORCE_COLOR: "0" },
        }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/dry run|Done/i);
    });
  }, 30_000);

  it("run respects --env override for on:$env configs", async () => {
    await withProjectDir(async (dir) => {
      const sample = join(root, "tests/fixtures/sample.scotty.sh");
      cpSync(sample, join(dir, "scotty.sh"), { force: true });

      const result = await execa(
        "node",
        [bin, "run", "pullCode", "--env=staging", "--dry-run"],
        {
          cwd: dir,
          reject: false,
          env: { ...process.env, FORCE_COLOR: "0" },
        }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("staging");
    });
  }, 30_000);

  it("run exits non-zero for unknown target", async () => {
    await withProjectDir(async (dir) => {
      const result = await execa(
        "node",
        [bin, "run", "not-a-real-macro", "--dry-run"],
        {
          cwd: dir,
          reject: false,
          env: { ...process.env, FORCE_COLOR: "0" },
        }
      );
      expect(result.exitCode).toBe(1);
    });
  }, 30_000);
});
