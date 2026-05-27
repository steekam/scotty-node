import * as p from "@clack/prompts";
import pc from "picocolors";
import type { SshClient, SshExecResult } from "../engine/ssh.js";
import type { SshOpsConfig } from "../types/sshOps.js";
import type { SshTarget } from "../utils/servers.js";
import { LogBuffer } from "./logBuffer.js";

export { confirmTask } from "./confirm.js";

export interface RemoteRunOptions {
  label: string;
  target: SshTarget;
  script: string;
  sshOps: SshOpsConfig;
  createClient: () => SshClient;
  dryRun?: boolean;
}

export async function runRemoteTask(
  opts: RemoteRunOptions
): Promise<{ ok: boolean; buffer: LogBuffer }> {
  const buffer = new LogBuffer();
  const spinner = p.spinner();
  const hostLabel = `${opts.target.serverKey} (${opts.target.connection})`;

  spinner.start(`${opts.label} → ${hostLabel}`);

  if (opts.dryRun) {
    spinner.stop(`${opts.label} → ${hostLabel} ${pc.dim("(dry run)")}`);
    return { ok: true, buffer };
  }

  const client = opts.createClient();

  try {
    await client.connect(opts.target, opts.sshOps);
    const result = await client.exec(opts.script, opts.sshOps);
    buffer.appendStdout(result.stdout);
    buffer.appendStderr(result.stderr);

    if (result.code !== 0) {
      spinner.stop(`${opts.label} → ${hostLabel} ${pc.red("failed")}`);
      return { ok: false, buffer };
    }

    spinner.stop(`${opts.label} → ${hostLabel} ${pc.green("done")}`);
    return { ok: true, buffer };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    buffer.appendStderr(message);
    spinner.stop(`${opts.label} → ${hostLabel} ${pc.red("error")}`);
    return { ok: false, buffer };
  } finally {
    await client.dispose();
  }
}

export function logTaskFailure(taskName: string, buffer: LogBuffer): void {
  const stderr = buffer.getStderr().trim();
  const stdout = buffer.getStdout().trim();
  if (stderr) {
    p.log.error(`${taskName} stderr:\n${stderr}`);
  }
  if (stdout) {
    p.log.message(`${taskName} stdout:\n${pc.dim(stdout)}`);
  }
}

export function flushBufferedLogs(_buffer: LogBuffer): void {
  // Output is shown on failure via logTaskFailure; success stays quiet for clack layout.
}

export type { SshExecResult };
