import { describe, expect, it } from "vitest";
import { mergeOptions, parseCliOptions } from "../../src/utils/options.js";

describe("parseCliOptions", () => {
  it("parses --key=value and --key value forms", () => {
    expect(parseCliOptions(["--env=staging", "--branch", "feature"])).toEqual({
      env: "staging",
      branch: "feature",
    });
  });
});

describe("mergeOptions", () => {
  it("lets CLI flags override config defaults", () => {
    expect(
      mergeOptions({ env: "production", branch: "main" }, { env: "staging" })
    ).toEqual({ env: "staging", branch: "main" });
  });
});
