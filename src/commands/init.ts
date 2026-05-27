import * as p from "@clack/prompts";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { defineCommand } from "citty";
import { SCOTTY_SH_TEMPLATE } from "../templates/scotty.sh.js";
import { SCOTTY_CONFIG_MJS_TEMPLATE } from "../templates/scotty.config.mjs.js";
import { SCOTTY_SH, SCOTTY_CONFIG_MJS } from "../utils/configPath.js";

type ConfigType = "bash" | "js";

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Create a boilerplate scotty.sh or scotty.config.mjs file",
  },
  async run() {
    p.intro(pc.bgCyan(pc.black(" scotty-node init ")));

    const cwd = process.cwd();
    const shPath = join(cwd, SCOTTY_SH);
    const jsPath = join(cwd, SCOTTY_CONFIG_MJS);

    if (existsSync(shPath) || existsSync(jsPath)) {
      p.log.warn(
        `A config file already exists (${existsSync(shPath) ? SCOTTY_SH : SCOTTY_CONFIG_MJS}). Skipping init.`
      );
      p.outro(pc.dim("Nothing to do."));
      return;
    }

    const configType = await p.select({
      message: "Choose your configuration format:",
      options: [
        {
          value: "bash" as ConfigType,
          label: "Bash (scotty.sh)",
          hint: "Standard bash script with # @ annotations",
        },
        {
          value: "js" as ConfigType,
          label: "JavaScript (scotty.config.mjs)",
          hint: "Native JS with defineConfig and IDE support",
        },
      ],
    });

    if (p.isCancel(configType)) {
      p.cancel("Init cancelled.");
      process.exit(0);
    }

    if (configType === "bash") {
      writeFileSync(shPath, SCOTTY_SH_TEMPLATE, "utf8");
      p.log.success(`Created ${pc.cyan(SCOTTY_SH)}`);
    } else {
      writeFileSync(jsPath, SCOTTY_CONFIG_MJS_TEMPLATE, "utf8");
      p.log.success(`Created ${pc.cyan(SCOTTY_CONFIG_MJS)}`);
    }

    p.outro(pc.green("Ready! Run ") + pc.bold("scotty-node run deploy --env=production"));
  },
});
