import * as p from "@clack/prompts";
import pc from "picocolors";
import { defineCommand } from "citty";
import { findConfigFile } from "../utils/configPath.js";

export const runCommand = defineCommand({
  meta: {
    name: "run",
    description: "Execute a macro or a specific task",
  },
  args: {
    target: {
      type: "positional",
      description: "Macro or task name to run",
      required: true,
    },
  },
  async run({ args }) {
    const configPath = findConfigFile();

    if (!configPath) {
      p.log.error(
        `No ${pc.cyan("scotty.sh")} or ${pc.cyan("scotty.config.mjs")} found in the current directory.`
      );
      p.log.message(`Run ${pc.bold("scotty-node init")} to create one.`);
      process.exit(1);
    }

    p.intro(pc.bgCyan(pc.black(` scotty-node run ${args.target} `)));
    p.log.info(`Config: ${pc.dim(configPath)}`);
    p.log.warn("Task execution engine is not implemented yet (Milestone 3).");
    p.outro(pc.dim("Exiting."));
  },
});
