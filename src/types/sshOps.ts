export interface SshOpsConfig {
  /** Path to private key (~ expanded) */
  identityFile?: string;
  /** Bastion / jump host (user@host) */
  jumpHost?: string;
  /** Remote command timeout in milliseconds */
  timeoutMs?: number;
  /** TCP/SSH handshake timeout in milliseconds */
  connectTimeoutMs?: number;
  /** Connection/exec attempts (1 = no retries) */
  retries?: number;
  /** Delay between retries in milliseconds */
  retryDelayMs?: number;
  /** When false, sets ssh2 strictVendor handling via algorithms; uses known hosts file if set */
  strictHostKeyChecking?: boolean;
}

export const DEFAULT_SSH_OPS: Required<
  Pick<SshOpsConfig, "timeoutMs" | "connectTimeoutMs" | "retries" | "retryDelayMs">
> = {
  timeoutMs: 120_000,
  connectTimeoutMs: 15_000,
  retries: 1,
  retryDelayMs: 2_000,
};
