import { describe, expect, it } from "vitest";
import { buildRemoteScript, runLocalPreamble } from "../../src/engine/local.js";

describe("runLocalPreamble", () => {
  it("captures variables set in preamble", async () => {
    const local = await runLocalPreamble(
      'MY_VAR="hello-from-preamble"',
      { env: "test" }
    );
    expect(local.MY_VAR).toBe("hello-from-preamble");
  });
});

describe("buildRemoteScript", () => {
  it("injects option and context exports before task script", () => {
    const script = buildRemoteScript(
      "echo done",
      { branch: "main" },
      { APP_DIR: "/var/www" }
    );
    expect(script).toContain('export branch="main"');
    expect(script).toContain('export BRANCH="main"');
    expect(script).toContain('export APP_DIR="/var/www"');
    expect(script).toContain("echo done");
  });
});
