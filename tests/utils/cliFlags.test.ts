import { describe, expect, it } from "vitest";
import {
  isAssumeYes,
  isDryRun,
  stripMetaFlags,
} from "../../src/utils/cliFlags.js";
import { parseCliOptions } from "../../src/utils/options.js";

describe("cliFlags", () => {
  it("detects dry-run and yes flags", () => {
    const parsed = parseCliOptions(["deploy", "--dry-run", "-y", "--env=staging"]);
    expect(isDryRun(parsed)).toBe(true);
    expect(isAssumeYes(parsed)).toBe(true);
    expect(stripMetaFlags(parsed)).toEqual({ env: "staging" });
  });
});
