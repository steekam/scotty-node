import type { SshOpsConfig } from "./sshOps.js";

export type ConfigSource = "bash" | "js";

export interface ConfigState {
  source: ConfigSource;
  configPath: string;
  /** Global SSH connection settings from `# @ssh` or JS `ssh` block */
  ssh?: SshOpsConfig;
  /** Server alias → SSH target(s) */
  servers: Record<string, string[]>;
  /** Default options from config (before CLI overrides) */
  options: Record<string, string>;
  /** Raw bash executed locally before SSH (bash configs only) */
  localPreamble: string;
  /** JS context setup (js configs only) */
  contextFn?: (
    options: Record<string, string>
  ) => Promise<Record<string, string>> | Record<string, string>;
  tasks: Record<string, TaskConfig>;
  macros: Record<string, string[]>;
  hooks: Record<string, HookConfig>;
  notifications: NotificationConfig[];
}

export interface TaskConfig {
  name: string;
  /** Comma-separated server keys after interpolation (e.g. "production" or "web-1,web-2") */
  on: string;
  parallel: boolean;
  confirm?: string;
  script: string;
  /** Present when JS config uses function-valued task fields */
  jsDynamic?: import("../types.js").ScottyTask;
}

export type HookKind = "before" | "after" | "success" | "error";

export interface HookConfig {
  kind: HookKind;
  /** Bash script for bash configs */
  script?: string;
  /** Callable for JS configs */
  fn?: (...args: unknown[]) => Promise<void> | void;
}

export type NotificationChannel =
  | "slack"
  | "discord"
  | "gws"
  | "telegram"
  | "email"
  | "webhook";

export interface NotificationConfig {
  channel: NotificationChannel;
  params: Record<string, string>;
  /** JS-only dynamic resolvers */
  resolvers?: Record<
    string,
    | string
    | ((
        options: Record<string, string>,
        context: Record<string, string>
      ) => string)
  >;
}
