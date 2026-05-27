import * as p from "@clack/prompts";
import pc from "picocolors";
import { defineCommand } from "citty";
import { doctorCheck } from "../engine/runner.js";
import { loadConfig } from "../parsers/index.js";
import { findConfigFile } from "../utils/configPath.js";

export const doctorCommand = defineCommand({
  meta: {
    name: "doctor",
    description:
      "Parse configuration, test local execution, and verify SSH access",
  },
  args: {
    ssh: {
      type: "boolean",
      description: "Attempt SSH connections to all servers",
      default: false,
    },
  },
  async run({ args }) {
    p.intro(pc.bgCyan(pc.black(" scotty-node doctor ")));

    const configPath = findConfigFile();

    if (!configPath) {
      p.log.error(
        `No ${pc.cyan("scotty.sh")} or ${pc.cyan("scotty.config.mjs")} found.`
      );
      p.log.message(`Run ${pc.bold("scotty-node init")} to create one.`);
      process.exit(1);
    }

    const spinner = p.spinner();
    spinner.start("Parsing configuration…");

    try {
      const config = await loadConfig(configPath);
      spinner.stop(`Parsed ${pc.cyan(configPath)}`);

      p.log.info(
        `Servers: ${Object.keys(config.servers).join(", ") || "(none)"}`
      );
      p.log.info(
        `Tasks: ${Object.keys(config.tasks).join(", ") || "(none)"}`
      );
      p.log.info(
        `Macros: ${Object.keys(config.macros).join(", ") || "(none)"}`
      );

      const checkSpinner = p.spinner();
      checkSpinner.start("Running checks…");
      const { ok, messages } = await doctorCheck(config, {
        testSsh: Boolean(args.ssh),
      });
      checkSpinner.stop(ok ? "Checks passed" : "Checks failed");

      for (const msg of messages) {
        if (ok) p.log.success(msg);
        else p.log.error(msg);
      }

      if (!ok) {
        p.outro(pc.red("Doctor found issues."));
        process.exit(1);
      }

      p.outro(pc.green("All checks passed."));
    } catch (error) {
      spinner.stop("Parse failed");
      const message = error instanceof Error ? error.message : String(error);
      p.log.error(message);
      p.outro(pc.red("Doctor failed."));
      process.exit(1);
    }
  },
});
