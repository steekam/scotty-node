import { describe, expect, it } from "vitest";
import {
  mergeSshOps,
  parseSshDirective,
} from "../../src/parsers/sshDirective.js";

describe("parseSshDirective", () => {
  it("parses identity, jump, timeouts, and retries", () => {
    expect(
      parseSshDirective(
        'identity=~/.ssh/deploy jump=bastion@jump.example.com timeout=60000 retries=3'
      )
    ).toEqual({
      identityFile: "~/.ssh/deploy",
      jumpHost: "bastion@jump.example.com",
      timeoutMs: 60000,
      retries: 3,
    });
  });
});

describe("mergeSshOps", () => {
  it("later sources override earlier ones", () => {
    expect(
      mergeSshOps({ retries: 1 }, { retries: 5, timeoutMs: 30_000 }).retries
    ).toBe(5);
  });
});
