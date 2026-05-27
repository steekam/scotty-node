/**
 * Parse `--key=value` and `--key value` flags from argv (after the subcommand).
 */
export function parseCliOptions(argv: string[]): Record<string, string> {
  const options: Record<string, string> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;

    if (arg === "-y" || arg === "--yes") {
      options.yes = "true";
      continue;
    }

    if (!arg.startsWith("--")) continue;

    const eq = arg.indexOf("=");
    if (eq !== -1) {
      options[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("-")) {
      options[key] = next;
      i++;
    } else {
      options[key] = "true";
    }
  }

  return options;
}

/** CLI flags override @option defaults from config. */
export function mergeOptions(
  defaults: Record<string, string>,
  cliOverrides: Record<string, string>
): Record<string, string> {
  return { ...defaults, ...cliOverrides };
}
