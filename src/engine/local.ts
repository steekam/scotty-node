import { execa } from "execa";

/** Run bash preamble and return variables introduced or changed by it. */
export async function runLocalPreamble(
  preamble: string,
  options: Record<string, string>
): Promise<Record<string, string>> {
  if (!preamble.trim()) return {};

  const optionExports = Object.entries(options)
    .map(
      ([k, v]) =>
        `export ${k}="${escapeShell(v)}"; export ${k.toUpperCase()}="${escapeShell(v)}"`
    )
    .join("\n");

  const { stdout: beforeOut } = await execa("bash", ["-c", "env"], {
    env: { ...process.env },
  });
  const before = parseEnvOutput(beforeOut);

  const script = `
set -e
set -a
${optionExports}
${preamble}
set +a
env
`;

  const result = await execa("bash", ["-c", script], {
    env: { ...process.env },
  });

  if (result.failed) {
    throw new Error(
      result.stderr || `Local preamble exited with code ${result.exitCode}`
    );
  }

  const after = parseEnvOutput(result.stdout);
  const diff: Record<string, string> = {};

  for (const [key, value] of Object.entries(after)) {
    if (before[key] !== value && !isShellInternal(key)) {
      diff[key] = value;
    }
  }

  return diff;
}

export async function runLocalHook(
  script: string,
  options: Record<string, string>,
  context: Record<string, string>
): Promise<void> {
  const exports = buildExportPrefix(options, context);
  await execa("bash", ["-c", `${exports}\n${script}`], {
    stdio: "inherit",
  });
}

export function buildExportPrefix(
  options: Record<string, string>,
  context: Record<string, string>
): string {
  const vars: Record<string, string> = { ...context };
  for (const [k, v] of Object.entries(options)) {
    vars[k] = v;
    vars[k.toUpperCase()] = v;
  }
  return Object.entries(vars)
    .map(([k, v]) => `export ${k}="${escapeShell(v)}"`)
    .join("\n");
}

export function buildRemoteScript(
  script: string,
  options: Record<string, string>,
  context: Record<string, string>
): string {
  const exports = buildExportPrefix(options, context);
  return `set -e\n${exports}\n${script}`;
}

function parseEnvOutput(stdout: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of stdout.split("\n")) {
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function isShellInternal(key: string): boolean {
  return ["_", "PWD", "SHLVL", "OLDPWD"].includes(key);
}

function escapeShell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
