import { readFileSync } from "node:fs";
import { NodeSSH, type Config as SSH2Config } from "node-ssh";
import { logEvent } from "../ops/logger.js";
import { withRetry } from "../ops/retry.js";
import type { SshOpsConfig } from "../types/sshOps.js";
import { DEFAULT_SSH_OPS } from "../types/sshOps.js";
import { expandHome } from "../utils/path.js";
import type { SshTarget } from "../utils/servers.js";

export interface SshExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface SshClient {
  connect(target: SshTarget, ops?: SshOpsConfig): Promise<void>;
  exec(script: string, ops?: SshOpsConfig): Promise<SshExecResult>;
  dispose(): Promise<void>;
}

function resolveOps(ops?: SshOpsConfig): Required<
  Pick<SshOpsConfig, "timeoutMs" | "connectTimeoutMs" | "retries" | "retryDelayMs">
> &
  SshOpsConfig {
  return {
    ...DEFAULT_SSH_OPS,
    ...ops,
  };
}

function buildConnectConfig(
  target: SshTarget,
  ops: SshOpsConfig
): SSH2Config {
  const config: SSH2Config = {
    host: target.host,
    port: target.port ?? 22,
    username: target.username ?? process.env.USER ?? "root",
    readyTimeout: ops.connectTimeoutMs ?? DEFAULT_SSH_OPS.connectTimeoutMs,
  };

  if (ops.identityFile) {
    const keyPath = expandHome(ops.identityFile);
    config.privateKey = readFileSync(keyPath, "utf8");
  }

  if (ops.strictHostKeyChecking === false) {
    config.strictVendor = false;
    config.algorithms = {
      serverHostKey: ["ssh-rsa", "ssh-ed25519", "ecdsa-sha2-nistp256"],
    };
  }

  return config;
}

export class NodeSshClient implements SshClient {
  private ssh = new NodeSSH();
  private ops: SshOpsConfig = {};

  async connect(target: SshTarget, ops?: SshOpsConfig): Promise<void> {
    this.ops = resolveOps(ops);
    const resolved = this.ops;

    await withRetry(
      `ssh connect ${target.connection}`,
      async () => {
        const started = Date.now();
        logEvent("ssh.connect", undefined, {
          server: target.serverKey,
          host: target.host,
        });

        if (resolved.jumpHost) {
          await this.connectViaJump(target, resolved);
        } else {
          await this.ssh.connect(buildConnectConfig(target, resolved));
        }

        logEvent("ssh.connected", undefined, {
          server: target.serverKey,
          host: target.host,
          durationMs: Date.now() - started,
        });
      },
      {
        retries: resolved.retries ?? 1,
        retryDelayMs: resolved.retryDelayMs ?? 2000,
      }
    );
  }

  private async connectViaJump(
    target: SshTarget,
    ops: SshOpsConfig
  ): Promise<void> {
    const bastion = new NodeSSH();
    const jumpTarget = parseJumpHost(ops.jumpHost!);

    try {
      await bastion.connect(buildConnectConfig(jumpTarget, ops));

      const stream = await new Promise<NodeJS.ReadableStream>(
        (resolve, reject) => {
          bastion.connection.forwardOut(
            "127.0.0.1",
            0,
            target.host,
            target.port ?? 22,
            (err: Error | undefined, stream: NodeJS.ReadableStream) => {
              if (err) reject(err);
              else resolve(stream);
            }
          );
        }
      );

      const targetConfig = buildConnectConfig(target, ops);
      await this.ssh.connect({
        ...targetConfig,
        sock: stream,
      });
    } finally {
      bastion.dispose();
    }
  }

  async exec(script: string, ops?: SshOpsConfig): Promise<SshExecResult> {
    const resolved = resolveOps(ops ?? this.ops);
    const timeoutMs = resolved.timeoutMs ?? DEFAULT_SSH_OPS.timeoutMs;

    return withRetry(
      "ssh exec",
      () => this.execOnce(script, timeoutMs),
      {
        retries: resolved.retries ?? 1,
        retryDelayMs: resolved.retryDelayMs ?? 2000,
      }
    );
  }

  private async execOnce(
    script: string,
    timeoutMs: number
  ): Promise<SshExecResult> {
    const started = Date.now();

    const result = await Promise.race([
      this.ssh.execCommand(script, { execOptions: { pty: false } }),
      abortAfter(timeoutMs, `SSH command timed out after ${timeoutMs}ms`),
    ]);

    logEvent("ssh.exec", undefined, {
      durationMs: Date.now() - started,
      exitCode: result.code ?? -1,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
    };
  }

  async dispose(): Promise<void> {
    this.ssh.dispose();
  }
}

function parseJumpHost(jump: string): SshTarget {
  const at = jump.lastIndexOf("@");
  if (at === -1) {
    return {
      serverKey: "jump",
      connection: jump,
      host: jump,
    };
  }
  return {
    serverKey: "jump",
    connection: jump,
    username: jump.slice(0, at),
    host: jump.slice(at + 1),
  };
}

function abortAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export function createSshClient(): SshClient {
  return new NodeSshClient();
}
