import { describe, expect, it } from "vitest";
import { parseTaskModifiers } from "../../src/parsers/bash.js";

describe("parseTaskModifiers", () => {
  it("parses on, parallel, and quoted confirm", () => {
    expect(
      parseTaskModifiers('on:$env parallel confirm="Deploy to $env?"')
    ).toEqual({
      on: "$env",
      parallel: true,
      confirm: "Deploy to $env?",
    });
  });
});
