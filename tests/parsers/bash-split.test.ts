import { describe, expect, it } from "vitest";
import { parseBashContent } from "../../src/parsers/bash.js";

describe("bash split-line format (Scotty style)", () => {
  it("parses @task annotation on its own line before the function", () => {
    const content = `
# @servers remote=deployer@example.com
# @ssh timeout=90 retries=2

# @task on:remote
deploy() {
  git pull
}

# @task on:remote parallel
restartWorkers() {
  sudo service app reload
}
`;
    const config = parseBashContent(content, "scotty.sh");

    expect(config.ssh?.timeoutMs).toBe(90);
    expect(config.ssh?.retries).toBe(2);
    expect(config.tasks.deploy?.on).toBe("remote");
    expect(config.tasks.deploy?.script).toContain("git pull");
    expect(config.tasks.restartWorkers?.parallel).toBe(true);
  });

  it("parses @hook on its own line before the function", () => {
    const content = `
# @servers local=127.0.0.1

# @hook success
success() {
  echo "done"
}
`;
    const config = parseBashContent(content, "test.sh");
    expect(config.hooks.success?.script).toContain('echo "done"');
  });
});
