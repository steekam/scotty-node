import type { ConfigState, HookKind } from "../types/configState.js";
import { runLocalHook } from "../engine/local.js";

export interface HookContext {
  options: Record<string, string>;
  context: Record<string, string>;
  error?: Error;
}

export async function runHook(
  config: ConfigState,
  kind: HookKind,
  ctx: HookContext
): Promise<void> {
  const hook = config.hooks[kind];
  if (!hook) return;

  if (hook.fn) {
    if (kind === "error" && ctx.error) {
      await hook.fn(ctx.error, ctx.options, ctx.context);
    } else {
      await hook.fn(ctx.options, ctx.context);
    }
    return;
  }

  if (hook.script) {
    await runLocalHook(hook.script, ctx.options, ctx.context);
  }
}
