import { describe, expect, it } from "vitest";
import {
  buildInterpolationContext,
  interpolate,
} from "../../src/utils/interpolate.js";

describe("interpolate", () => {
  it("resolves $var and ${var} from options with uppercase aliases", () => {
    const ctx = buildInterpolationContext({ env: "staging", branch: "dev" });
    expect(interpolate("on:$env", ctx)).toBe("on:staging");
    expect(interpolate("pull $BRANCH", ctx)).toBe("pull dev");
  });
});
