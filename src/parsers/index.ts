import { basename } from "node:path";
import type { ConfigState } from "../types/configState.js";
import { parseBashConfig } from "./bash.js";
import { parseJsConfig } from "./js.js";

export async function loadConfig(configPath: string): Promise<ConfigState> {
  const name = basename(configPath);
  if (name === "scotty.sh" || name.endsWith(".sh")) {
    return parseBashConfig(configPath);
  }
  if (name === "scotty.config.mjs" || name.endsWith(".mjs")) {
    return await parseJsConfig(configPath);
  }
  throw new Error(`Unsupported config file: ${configPath}`);
}

export { parseBashConfig, parseBashContent } from "./bash.js";
export { parseJsConfig, normalizeJsConfig, resolveJsTask } from "./js.js";
