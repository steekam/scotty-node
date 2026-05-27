import { existsSync } from "node:fs";
import { join } from "node:path";

export const SCOTTY_SH = "scotty.sh";
export const SCOTTY_CONFIG_MJS = "scotty.config.mjs";

export function findConfigFile(cwd = process.cwd()): string | null {
  const shPath = join(cwd, SCOTTY_SH);
  if (existsSync(shPath)) return shPath;

  const jsPath = join(cwd, SCOTTY_CONFIG_MJS);
  if (existsSync(jsPath)) return jsPath;

  return null;
}

export function configExists(cwd = process.cwd()): boolean {
  return findConfigFile(cwd) !== null;
}
