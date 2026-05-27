/** Meta flags that must not be merged into scotty @option values. */
const META_FLAGS = new Set([
  "yes",
  "y",
  "dry-run",
  "pretend",
  "ssh",
]);

export function stripMetaFlags(
  options: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(options)) {
    if (!META_FLAGS.has(key)) out[key] = value;
  }
  return out;
}

export function isDryRun(options: Record<string, string>): boolean {
  return options.pretend === "true" || options["dry-run"] === "true";
}

export function isAssumeYes(options: Record<string, string>): boolean {
  return options.yes === "true" || options.y === "true";
}
