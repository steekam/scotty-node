import { readFileSync } from "node:fs";
import type {
  ConfigState,
  HookConfig,
  HookKind,
  NotificationChannel,
  NotificationConfig,
  TaskConfig,
} from "../types/configState.js";
import type { SshOpsConfig } from "../types/sshOps.js";
import { parseServersDirective } from "../utils/servers.js";
import { parseSshDirective } from "./sshDirective.js";

const ANNOTATION =
  /^\s*#\s*@(servers|option|macro|task|hook|notify|ssh)\s*(.*)$/;

const TASK_INLINE =
  /^\s*#\s*@task\s+(.*?)\s+(\w+)\s*\(\s*\)\s*\{\s*$/;

const TASK_ANNOTATION = /^\s*#\s*@task\s+(.*)$/;

const HOOK_INLINE = /^\s*#\s*@hook\s+(\w+)\s*\(\s*\)\s*\{\s*$/;

const HOOK_ANNOTATION = /^\s*#\s*@hook\s+(\w+)\s*$/;

const FUNCTION_DEF = /^\s*(\w+)\s*\(\s*\)\s*\{/;

const BLOCK_ANNOTATION = /^\s*#\s*@(task|hook|macro|servers|option|notify|ssh)\b/;

export function parseBashConfig(configPath: string): ConfigState {
  const content = readFileSync(configPath, "utf8");
  return parseBashContent(content, configPath);
}

export function parseBashContent(content: string, configPath: string): ConfigState {
  const lines = content.split("\n");
  const firstTaskIdx = lines.findIndex((line) => /^\s*#\s*@task\b/.test(line));
  const firstHookIdx = lines.findIndex((line) => /^\s*#\s*@hook\b/.test(line));
  const blockIndices = [firstTaskIdx, firstHookIdx].filter((i) => i >= 0);
  const firstBlockIdx =
    blockIndices.length > 0 ? Math.min(...blockIndices) : -1;

  const preambleLines =
    firstBlockIdx === -1 ? lines : lines.slice(0, firstBlockIdx);
  const localPreamble = preambleLines.join("\n");

  const servers: Record<string, string[]> = {};
  const options: Record<string, string> = {};
  const macros: Record<string, string[]> = {};
  const tasks: Record<string, TaskConfig> = {};
  const hooks: Record<string, HookConfig> = {};
  const notifications: NotificationConfig[] = [];
  let ssh: SshOpsConfig | undefined;

  for (const line of lines) {
    const match = line.match(ANNOTATION);
    if (!match) continue;

    const [, kind, rest] = match;
    const value = (rest ?? "").trim();

    switch (kind) {
      case "servers":
        Object.assign(servers, parseServersDirective(value));
        break;
      case "option": {
        const eq = value.indexOf("=");
        if (eq !== -1) {
          options[value.slice(0, eq)] = value.slice(eq + 1);
        }
        break;
      }
      case "macro": {
        const parts = value.split(/\s+/).filter(Boolean);
        const name = parts[0];
        if (name) macros[name] = parts.slice(1);
        break;
      }
      case "notify":
        notifications.push(parseNotifyDirective(value));
        break;
      case "ssh":
        ssh = { ...ssh, ...parseSshDirective(value) };
        break;
      default:
        break;
    }
  }

  if (firstBlockIdx !== -1) {
    let i = firstBlockIdx;
    while (i < lines.length) {
      const inlineTask = lines[i]!.match(TASK_INLINE);
      if (inlineTask) {
        const [, modifiersRaw, name] = inlineTask;
        const { body, endIndex } = extractBracedBlock(lines, i);
        tasks[name!] = buildTask(name!, modifiersRaw ?? "", body);
        i = endIndex + 1;
        continue;
      }

      const taskAnnotation = lines[i]!.match(TASK_ANNOTATION);
      if (taskAnnotation && !inlineTask) {
        const modifiersRaw = taskAnnotation[1] ?? "";
        const fn = findFollowingFunction(lines, i + 1);
        if (!fn) {
          throw new Error(
            `Task annotation at line ${i + 1} is not followed by a bash function definition`
          );
        }
        const { body, endIndex } = extractBracedBlock(lines, fn.index);
        tasks[fn.name] = buildTask(fn.name, modifiersRaw, body);
        i = endIndex + 1;
        continue;
      }

      const inlineHook = lines[i]!.match(HOOK_INLINE);
      if (inlineHook) {
        const hookName = inlineHook[1]! as HookKind;
        const { body, endIndex } = extractBracedBlock(lines, i);
        hooks[hookName] = { kind: hookName, script: body };
        i = endIndex + 1;
        continue;
      }

      const hookAnnotation = lines[i]!.match(HOOK_ANNOTATION);
      if (hookAnnotation) {
        const hookName = hookAnnotation[1]! as HookKind;
        const fn = findFollowingFunction(lines, i + 1, hookName);
        if (!fn) {
          throw new Error(
            `Hook annotation at line ${i + 1} is not followed by function ${hookName}()`
          );
        }
        const { body, endIndex } = extractBracedBlock(lines, fn.index);
        hooks[hookName] = { kind: hookName, script: body };
        i = endIndex + 1;
        continue;
      }

      i++;
    }
  }

  return {
    source: "bash",
    configPath,
    servers,
    options,
    localPreamble,
    ssh,
    tasks,
    macros,
    hooks,
    notifications,
  };
}

function buildTask(
  name: string,
  modifiersRaw: string,
  script: string
): TaskConfig {
  const modifiers = parseTaskModifiers(modifiersRaw);
  return {
    name,
    on: modifiers.on ?? "local",
    parallel: modifiers.parallel,
    confirm: modifiers.confirm,
    script,
  };
}

/** Find the next `name() {` after an annotation, skipping blanks and comments. */
export function findFollowingFunction(
  lines: string[],
  fromIndex: number,
  expectedName?: string
): { name: string; index: number } | null {
  for (let i = fromIndex; i < lines.length; i++) {
    const line = lines[i]!;
    if (BLOCK_ANNOTATION.test(line)) return null;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = line.match(FUNCTION_DEF);
    if (!match) return null;

    const name = match[1]!;
    if (expectedName && name !== expectedName) {
      throw new Error(
        `Expected function ${expectedName}() after annotation (line ${i + 1}), found ${name}()`
      );
    }
    return { name, index: i };
  }
  return null;
}

export function parseTaskModifiers(modifiersRaw: string): {
  on?: string;
  parallel: boolean;
  confirm?: string;
} {
  let on: string | undefined;
  let parallel = false;
  let confirm: string | undefined;

  const confirmMatch = modifiersRaw.match(
    /confirm=(?:"([^"]*)"|'([^']*)'|(\S+))/
  );
  if (confirmMatch) {
    confirm = confirmMatch[1] ?? confirmMatch[2] ?? confirmMatch[3];
    modifiersRaw = modifiersRaw.replace(confirmMatch[0], "").trim();
  }

  if (/\bparallel\b/.test(modifiersRaw)) {
    parallel = true;
    modifiersRaw = modifiersRaw.replace(/\bparallel\b/g, "").trim();
  }

  const onMatch = modifiersRaw.match(/on:(\S+)/);
  if (onMatch) {
    on = onMatch[1];
    modifiersRaw = modifiersRaw.replace(onMatch[0], "").trim();
  }

  return { on, parallel, confirm };
}

function extractBracedBlock(
  lines: string[],
  startIndex: number
): { body: string; endIndex: number } {
  let depth = 0;
  const bodyLines: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]!;
    for (const ch of line) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
    }

    if (i === startIndex) {
      const afterBrace = line.replace(/^[^\{]*\{/, "").trimEnd();
      if (afterBrace) bodyLines.push(afterBrace);
    } else if (depth > 0) {
      bodyLines.push(line);
    }

    if (i > startIndex && depth === 0) {
      const last = bodyLines[bodyLines.length - 1];
      if (last !== undefined) {
        bodyLines[bodyLines.length - 1] = last.replace(/\}\s*$/, "");
      }
      return { body: bodyLines.join("\n").trim(), endIndex: i };
    }
  }

  throw new Error(`Unclosed block starting at line ${startIndex + 1}`);
}

function parseNotifyDirective(value: string): NotificationConfig {
  const parts = value.split(/\s+/);
  const channel = parts[0] as NotificationChannel;
  const params: Record<string, string> = {};

  const paramStr = parts.slice(1).join(" ");
  const regex = /(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(paramStr)) !== null) {
    params[m[1]!] = m[2] ?? m[3] ?? m[4] ?? "";
  }

  return { channel, params };
}
