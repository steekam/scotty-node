import { defineCommand, runMain } from "citty";
import pc from "picocolors";
import { initCommand } from "./commands/init.js";
import { runCommand } from "./commands/run.js";
import { doctorCommand } from "./commands/doctor.js";

export { defineConfig } from "./defineConfig.js";
export type { ScottyConfig, ScottyTask } from "./types.js";

const main = defineCommand({
  meta: {
    name: "scotty-node",
    version: "0.1.0",
    description:
      "A concurrent SSH task runner and deployment tool for Node.js",
  },
  subCommands: {
    init: initCommand,
    run: runCommand,
    doctor: doctorCommand,
  },
});

runMain(main).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(`Fatal: ${message}`));
  process.exit(1);
});
