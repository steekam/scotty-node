import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseJsConfig, resolveJsTask } from "../../src/parsers/js.js";

describe("parseJsConfig", () => {
  it("loads and normalizes a JS config file", async () => {
    const configPath = join(
      import.meta.dirname,
      "../fixtures/sample.config.mjs"
    );
    const config = await parseJsConfig(configPath);

    expect(config.source).toBe("js");
    expect(config.servers.production).toEqual(["deployer@prod.example.com"]);
    expect(config.macros.release).toEqual(["deploy"]);
    expect(config.tasks.deploy?.jsDynamic).toBeDefined();
  });

  it("resolves dynamic task fields at runtime", async () => {
    const configPath = join(
      import.meta.dirname,
      "../fixtures/sample.config.mjs"
    );
    const config = await parseJsConfig(configPath);
    const task = config.tasks.deploy!;

    const resolved = resolveJsTask(task, { env: "production", branch: "main" }, {
      APP_DIR: "/var/www",
    });

    expect(resolved.on).toBe("production");
    expect(resolved.script).toContain("/var/www");
    expect(resolved.script).toContain("git pull main");
  });
});
