import { pathToFileURL } from "node:url";
import type { ScottyConfig, ScottyTask } from "../types.js";
import type {
  ConfigState,
  HookConfig,
  HookKind,
  NotificationChannel,
  NotificationConfig,
  TaskConfig,
} from "../types/configState.js";

const HOOK_KINDS = new Set<string>(["before", "after", "success", "error"]);

export async function parseJsConfig(configPath: string): Promise<ConfigState> {
  const mod = await import(pathToFileURL(configPath).href);
  const config: ScottyConfig = mod.default ?? mod.config;

  if (!config || typeof config !== "object") {
    throw new Error(`${configPath} must export a default config object`);
  }

  validateJsConfig(config);
  return normalizeJsConfig(config, configPath);
}

export function validateJsConfig(config: ScottyConfig): void {
  if (!config.servers || typeof config.servers !== "object") {
    throw new Error("Config must define a `servers` object");
  }

  for (const [name, value] of Object.entries(config.servers)) {
    if (typeof value === "string") continue;
    if (Array.isArray(value) && value.every((v) => typeof v === "string")) continue;
    throw new Error(`servers.${name} must be a string or string[]`);
  }
}

export function normalizeJsConfig(
  config: ScottyConfig,
  configPath: string
): ConfigState {
  const servers: Record<string, string[]> = {};
  for (const [name, value] of Object.entries(config.servers)) {
    servers[name] = Array.isArray(value) ? value : [value];
  }

  const options: Record<string, string> = {};
  if (config.options) {
    for (const [key, value] of Object.entries(config.options)) {
      options[key] = String(value);
    }
  }

  const tasks: Record<string, TaskConfig> = {};
  if (config.tasks) {
    for (const [name, task] of Object.entries(config.tasks)) {
      tasks[name] = normalizeJsTask(name, task);
    }
  }

  const hooks: Record<string, HookConfig> = {};
  if (config.hooks) {
    for (const [name, fn] of Object.entries(config.hooks)) {
      if (!HOOK_KINDS.has(name)) continue;
      hooks[name] = { kind: name as HookKind, fn };
    }
  }

  const notifications: NotificationConfig[] = [];
  if (config.notifications) {
    for (const [channel, payload] of Object.entries(config.notifications)) {
      notifications.push({
        channel: channel as NotificationChannel,
        params: {},
        resolvers: payload as NotificationConfig["resolvers"],
      });
    }
  }

  return {
    source: "js",
    configPath,
    servers,
    ssh: config.ssh,
    options,
    localPreamble: "",
    contextFn: config.context
      ? async (opts) => {
          const result = await config.context!(opts);
          return stringifyRecord(result);
        }
      : undefined,
    tasks,
    macros: config.macros ?? {},
    hooks,
    notifications,
  };
}

function normalizeJsTask(name: string, task: ScottyTask): TaskConfig {
  let on = "local";
  if (typeof task.on === "string") on = task.on;

  const hasDynamic =
    typeof task.on === "function" ||
    typeof task.confirm === "function" ||
    typeof task.run === "function";

  return {
    name,
    on,
    parallel: task.parallel ?? false,
    confirm: typeof task.confirm === "string" ? task.confirm : undefined,
    script: typeof task.run === "string" ? task.run : "",
    jsDynamic: hasDynamic ? task : undefined,
  };
}

function stringifyRecord(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

/** Resolve JS task fields that are functions (on, confirm, run). */
export function resolveJsTask(
  task: TaskConfig,
  options: Record<string, string>,
  context: Record<string, string>
): TaskConfig {
  const dynamic = task.jsDynamic;
  if (!dynamic) return task;

  const opts = options as Record<string, unknown>;
  const ctx = context as Record<string, unknown>;

  const on =
    typeof dynamic.on === "function"
      ? String(dynamic.on(opts))
      : typeof dynamic.on === "string"
        ? dynamic.on
        : task.on;

  const confirm =
    typeof dynamic.confirm === "function"
      ? String(dynamic.confirm(opts))
      : task.confirm;

  const script =
    typeof dynamic.run === "function"
      ? dynamic.run(opts, ctx)
      : task.script;

  return { ...task, on, confirm, script };
}
