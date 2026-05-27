import type { SshOpsConfig } from "../types/sshOps.js";
import { DEFAULT_SSH_OPS } from "../types/sshOps.js";

/** Parse `# @ssh identity=~/.ssh/id_rsa timeout=120 retries=3 jump=user@bastion` */
export function parseSshDirective(value: string): SshOpsConfig {
  const ops: SshOpsConfig = {};
  const regex = /(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(value)) !== null) {
    const key = m[1]!.toLowerCase();
    const raw = m[2] ?? m[3] ?? m[4] ?? "";

    switch (key) {
      case "identity":
      case "identityfile":
        ops.identityFile = raw;
        break;
      case "jump":
      case "jumphost":
      case "bastion":
        ops.jumpHost = raw;
        break;
      case "timeout":
      case "timeoutms":
        ops.timeoutMs = Number(raw);
        break;
      case "connect_timeout":
      case "connecttimeout":
        ops.connectTimeoutMs = Number(raw);
        break;
      case "retries":
        ops.retries = Number(raw);
        break;
      case "retry_delay":
      case "retry_delay_ms":
        ops.retryDelayMs = Number(raw);
        break;
      case "strict_host_key_checking":
        ops.strictHostKeyChecking = raw !== "false" && raw !== "0";
        break;
      default:
        break;
    }
  }

  return ops;
}

export function mergeSshOps(
  ...sources: (SshOpsConfig | undefined)[]
): SshOpsConfig {
  const merged: SshOpsConfig = { ...DEFAULT_SSH_OPS };

  for (const src of sources) {
    if (!src) continue;
    Object.assign(merged, src);
  }

  return merged;
}

/** Env-based SSH overrides for CI / local dev. */
export function sshOpsFromEnv(): SshOpsConfig {
  const ops: SshOpsConfig = {};

  if (process.env.SCOTTY_SSH_IDENTITY) {
    ops.identityFile = process.env.SCOTTY_SSH_IDENTITY;
  }
  if (process.env.SCOTTY_SSH_JUMP) {
    ops.jumpHost = process.env.SCOTTY_SSH_JUMP;
  }
  if (process.env.SCOTTY_SSH_TIMEOUT_MS) {
    ops.timeoutMs = Number(process.env.SCOTTY_SSH_TIMEOUT_MS);
  }
  if (process.env.SCOTTY_SSH_CONNECT_TIMEOUT_MS) {
    ops.connectTimeoutMs = Number(process.env.SCOTTY_SSH_CONNECT_TIMEOUT_MS);
  }
  if (process.env.SCOTTY_SSH_RETRIES) {
    ops.retries = Number(process.env.SCOTTY_SSH_RETRIES);
  }
  if (process.env.SCOTTY_SSH_RETRY_DELAY_MS) {
    ops.retryDelayMs = Number(process.env.SCOTTY_SSH_RETRY_DELAY_MS);
  }

  return ops;
}
