import type { ConfigState, TaskConfig } from "../types/configState.js";
import { resolveJsTask } from "../parsers/js.js";
import { runHook } from "../hooks/runner.js";
import { dispatchNotifications } from "../notifications/index.js";
import {
  buildInterpolationContext,
  interpolate,
} from "../utils/interpolate.js";
import { mergeOptions } from "../utils/options.js";
import { resolveTaskTargets } from "../utils/servers.js";
import { buildRemoteScript, runLocalPreamble } from "./local.js";
import { createSshClient, type SshClient } from "./ssh.js";
import { logEvent } from "../ops/logger.js";
import { mergeSshOps, sshOpsFromEnv } from "../parsers/sshDirective.js";
import type { SshOpsConfig } from "../types/sshOps.js";
import { confirmTask } from "../tui/confirm.js";
import { logTaskFailure, runRemoteTask } from "../tui/taskRunner.js";

export interface RunContext {
  target: string;
  cliOptions: Record<string, string>;
  dryRun?: boolean;
  assumeYes?: boolean;
  sshOps?: SshOpsConfig;
  createSshClient?: () => SshClient;
}

export interface RunResult {
  success: boolean;
  error?: Error;
}

export async function executeRun(
  config: ConfigState,
  ctx: RunContext
): Promise<RunResult> {
  const options = mergeOptions(config.options, ctx.cliOptions);
  const createClient = ctx.createSshClient ?? createSshClient;
  const sshOps = mergeSshOps(config.ssh, sshOpsFromEnv(), ctx.sshOps);

  let context: Record<string, string> = {};

  try {
    logEvent("run.start", undefined, { task: ctx.target, dryRun: ctx.dryRun });
    await runHook(config, "before", { options, context });

    if (config.source === "bash") {
      context = await runLocalPreamble(config.localPreamble, options);
    } else if (config.contextFn) {
      context = await config.contextFn(options);
    }

    const taskNames = resolveTargetTasks(config, ctx.target);
    const interpolation = buildInterpolationContext(options, context);

    for (const taskName of taskNames) {
      const rawTask = config.tasks[taskName];
      if (!rawTask) {
        throw new Error(`Unknown task "${taskName}"`);
      }

      const task = resolveTaskForExecution(rawTask, options, context);
      const success = await executeTask({
        config,
        task,
        options,
        context,
        interpolation,
        dryRun: ctx.dryRun,
        assumeYes: ctx.assumeYes,
        sshOps,
        createClient,
      });

      if (!success) {
        throw new Error(`Task "${taskName}" failed`);
      }
    }

    await runHook(config, "after", { options, context });
    await runHook(config, "success", { options, context });
    if (!ctx.dryRun) {
      await dispatchNotifications(config, options, context);
    }

    logEvent("run.success", undefined, { task: ctx.target });
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logEvent("run.error", err.message, { task: ctx.target, level: "error" });
    await runHook(config, "error", { options, context, error: err });
    return { success: false, error: err };
  }
}

function resolveTargetTasks(config: ConfigState, target: string): string[] {
  if (config.macros[target]) {
    return config.macros[target]!;
  }
  if (config.tasks[target]) {
    return [target];
  }
  throw new Error(
    `Unknown macro or task "${target}". Available: ${[
      ...Object.keys(config.macros),
      ...Object.keys(config.tasks),
    ].join(", ")}`
  );
}

function resolveTaskForExecution(
  task: TaskConfig,
  options: Record<string, string>,
  context: Record<string, string>
): TaskConfig {
  const resolved = task.jsDynamic ? resolveJsTask(task, options, context) : task;
  const ctx = buildInterpolationContext(options, context);

  return {
    ...resolved,
    on: interpolate(resolved.on, ctx),
    confirm: resolved.confirm
      ? interpolate(resolved.confirm, ctx)
      : undefined,
    script: resolved.script,
  };
}

async function executeTask(params: {
  config: ConfigState;
  task: TaskConfig;
  options: Record<string, string>;
  context: Record<string, string>;
  interpolation: Record<string, string>;
  dryRun?: boolean;
  assumeYes?: boolean;
  sshOps: SshOpsConfig;
  createClient: () => SshClient;
}): Promise<boolean> {
  const {
    task,
    config,
    options,
    context,
    interpolation,
    dryRun,
    assumeYes,
    sshOps,
    createClient,
  } = params;

  if (task.confirm && !dryRun && !assumeYes) {
    const confirmed = await confirmTask(task.confirm);
    if (!confirmed) {
      throw new Error(`Task "${task.name}" cancelled by user`);
    }
  }

  const targets = resolveTaskTargets(task.on, config, interpolation);
  const script = buildRemoteScript(task.script, options, context);

  const runOnTarget = async (target: (typeof targets)[0]) => {
    const { ok, buffer } = await runRemoteTask({
      label: task.name,
      target,
      script,
      sshOps,
      createClient,
      dryRun,
    });
    if (!ok) logTaskFailure(task.name, buffer);
    return ok;
  };

  if (task.parallel && targets.length > 1) {
    const results = await Promise.all(targets.map(runOnTarget));
    return results.every(Boolean);
  }

  for (const target of targets) {
    const ok = await runOnTarget(target);
    if (!ok) return false;
  }

  return true;
}

/** Doctor: validate config shape and optionally test connections. */
export async function doctorCheck(
  config: ConfigState,
  opts: { testSsh?: boolean; dryRun?: boolean } = {}
): Promise<{ ok: boolean; messages: string[] }> {
  const messages: string[] = [];

  if (Object.keys(config.servers).length === 0) {
    messages.push("Warning: no servers defined");
  }

  if (Object.keys(config.tasks).length === 0) {
    messages.push("Warning: no tasks defined");
  }

  try {
    const options = { ...config.options };
    if (config.source === "bash" && config.localPreamble.trim()) {
      await runLocalPreamble(config.localPreamble, options);
      messages.push("Local preamble executed successfully");
    } else if (config.contextFn) {
      await config.contextFn(options);
      messages.push("Local setup function executed successfully");
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    messages.push(`Local execution failed: ${msg}`);
    return { ok: false, messages };
  }

  if (opts.testSsh) {
    for (const [key, hosts] of Object.entries(config.servers)) {
      for (const connection of hosts) {
        const targets = resolveTaskTargets(key, config, {});
        const target = targets[0];
        if (!target) continue;
        const sshOps = mergeSshOps(config.ssh, sshOpsFromEnv());
        const client = createSshClient();
        try {
          await client.connect(target, sshOps);
          messages.push(`SSH OK: ${key} (${connection})`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          messages.push(`SSH failed: ${key} (${connection}) — ${msg}`);
          return { ok: false, messages };
        } finally {
          await client.dispose();
        }
      }
    }
  }

  return { ok: true, messages };
}
