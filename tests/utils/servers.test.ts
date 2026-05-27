import { describe, expect, it } from "vitest";
import type { ConfigState } from "../../src/types/configState.js";
import {
  parseConnectionString,
  parseServersDirective,
  resolveTaskTargets,
} from "../../src/utils/servers.js";
import { buildInterpolationContext } from "../../src/utils/interpolate.js";

describe("parseServersDirective", () => {
  it("parses name=host pairs", () => {
    expect(
      parseServersDirective(
        "production=deployer@prod.example.com staging=user@staging.example.com"
      )
    ).toEqual({
      production: ["deployer@prod.example.com"],
      staging: ["user@staging.example.com"],
    });
  });
});

describe("parseConnectionString", () => {
  it("splits user@host:port", () => {
    expect(parseConnectionString("deployer@host.example.com:2222")).toEqual({
      username: "deployer",
      host: "host.example.com",
      port: 2222,
    });
  });
});

describe("resolveTaskTargets", () => {
  const config: ConfigState = {
    source: "bash",
    configPath: "x",
    servers: {
      production: ["deployer@prod.example.com"],
      staging: ["deployer@staging.example.com"],
    },
    options: { env: "production" },
    localPreamble: "",
    tasks: {},
    macros: {},
    hooks: {},
    notifications: [],
  };

  it("interpolates on:$env before resolving server keys", () => {
    const ctx = buildInterpolationContext({ env: "staging" });
    const targets = resolveTaskTargets("$env", config, ctx);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.serverKey).toBe("staging");
    expect(targets[0]!.username).toBe("deployer");
  });

  it("supports comma-separated server groups", () => {
    const targets = resolveTaskTargets("production,staging", config, {});
    expect(targets).toHaveLength(2);
    expect(targets.map((t) => t.serverKey)).toEqual(["production", "staging"]);
  });
});
