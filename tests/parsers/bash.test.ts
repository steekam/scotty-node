import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBashContent } from "../../src/parsers/bash.js";

const fixture = readFileSync(
  join(import.meta.dirname, "../fixtures/sample.scotty.sh"),
  "utf8"
);

describe("parseBashContent", () => {
  it("extracts servers, options, macros, tasks, hooks, and notifications", () => {
    const config = parseBashContent(fixture, "scotty.sh");

    expect(config.servers.production).toEqual(["deployer@prod.example.com"]);
    expect(config.servers.staging).toEqual(["deployer@staging.example.com"]);
    expect(config.options).toEqual({ branch: "main", env: "production" });
    expect(config.macros.deploy).toEqual(["pullCode", "installDeps"]);
    expect(config.localPreamble).toContain('APP_DIR="/var/www/app"');
    expect(config.tasks.pullCode?.on).toBe("$env");
    expect(config.tasks.pullCode?.confirm).toBe("Deploy to $env?");
    expect(config.tasks.pullCode?.script).toContain("git pull");
    expect(config.tasks.installDeps?.parallel).toBe(true);
    expect(config.hooks.success?.script).toContain('echo "ok"');
    expect(config.notifications[0]?.channel).toBe("slack");
    expect(config.notifications[0]?.params.message).toContain("$env");
  });

  it("captures full task bodies with nested braces", () => {
    const content = `
# @servers local=127.0.0.1
# @task on:local demo() {
  if [ -f foo ]; then
    echo "{ not a closer }"
  fi
}
`;
    const config = parseBashContent(content, "test.sh");
    expect(config.tasks.demo?.script).toContain('echo "{ not a closer }"');
  });
});
