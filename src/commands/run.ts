import * as p from "@clack/prompts";
import pc from "picocolors";
import { defineCommand } from "citty";
import { executeRun } from "../engine/runner.js";
import { loadConfig } from "../parsers/index.js";
import { parseCliOptions } from "../utils/options.js";
import {
  isAssumeYes,
  isDryRun,
  stripMetaFlags,
} from "../utils/cliFlags.js";
import { setAssumeYes } from "../tui/confirm.js";
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
  async run({ args, rawArgs }) {
    const configPath = findConfigFile();

    if (!configPath) {
      p.log.error(
        `No ${pc.cyan("scotty.sh")} or ${pc.cyan("scotty.config.mjs")} found in the current directory.`
      );
      p.log.message(`Run ${pc.bold("scotty-node init")} to create one.`);
      process.exit(1);
    }

    const parsed = parseCliOptions(rawArgs);
    const dryRun = isDryRun(parsed);
    const assumeYes = isAssumeYes(parsed);
    const cliOptions = stripMetaFlags(parsed);

    setAssumeYes(assumeYes);

    p.intro(pc.bgCyan(pc.black(` scotty-node run ${args.target} `)));

    try {
      const config = await loadConfig(configPath);
      const result = await executeRun(config, {
        target: args.target as string,
        cliOptions,
        dryRun,
        assumeYes,
      });

      if (result.success) {
        p.outro(pc.green("Done."));
      } else {
        if (result.error) p.log.error(result.error.message);
        p.outro(pc.red("Failed."));
        process.exit(1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      p.log.error(message);
      p.outro(pc.red("Failed."));
      process.exit(1);
    }
  },
});
