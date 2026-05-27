import { homedir } from "node:os";
import { resolve } from "node:path";

export function expandHome(path: string): string {
  if (path.startsWith("~/")) {
    return resolve(homedir(), path.slice(2));
  }
  if (path === "~") {
    return homedir();
  }
  return path;
}
