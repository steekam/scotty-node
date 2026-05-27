import * as p from "@clack/prompts";
import pc from "picocolors";
import { defineCommand } from "citty";
import { findConfigFile } from "../utils/configPath.js";

export const doctorCommand = defineCommand({
  meta: {
    name: "doctor",
    description:
      "Parse configuration, test local execution, and verify SSH access",
  },
  async run() {
    p.intro(pc.bgCyan(pc.black(" scotty-node doctor ")));

    const configPath = findConfigFile();

    if (!configPath) {
      p.log.error(
        `No ${pc.cyan("scotty.sh")} or ${pc.cyan("scotty.config.mjs")} found.`
      );
      p.log.message(`Run ${pc.bold("scotty-node init")} to create one.`);
      process.exit(1);
    }

    p.log.info(`Found config: ${pc.cyan(configPath)}`);
    p.log.warn("Full doctor checks will be implemented in Milestone 2–3.");
    p.outro(pc.green("Config file detected."));
  },
});
