import type { ConfigState } from "../types/configState.js";
import { interpolate } from "./interpolate.js";

export interface SshTarget {
  serverKey: string;
  /** user@host or host */
  connection: string;
  host: string;
  username?: string;
  port?: number;
}

/** Parse `deployer@host.com` or `deployer@host.com:2222` */
export function parseConnectionString(connection: string): {
  host: string;
  username?: string;
  port?: number;
} {
  let rest = connection.trim();
  let port: number | undefined;

  const colonPort = rest.match(/:(\d+)$/);
  if (colonPort && rest.includes("@")) {
    port = Number(colonPort[1]);
    rest = rest.slice(0, -colonPort[0]!.length);
  } else if (colonPort && !rest.includes("@")) {
    port = Number(colonPort[1]);
    rest = rest.slice(0, -colonPort[0]!.length);
  }

  const at = rest.lastIndexOf("@");
  if (at === -1) {
    return { host: rest, port };
  }

  return {
    username: rest.slice(0, at),
    host: rest.slice(at + 1),
    port,
  };
}

/**
 * Resolve `on:` modifier to concrete SSH targets.
 * Supports comma-separated keys and `$option` interpolation.
 */
export function resolveTaskTargets(
  onModifier: string,
  config: ConfigState,
  interpolation: Record<string, string>
): SshTarget[] {
  const resolvedOn = interpolate(onModifier, interpolation);
  const keys = resolvedOn.split(",").map((k) => k.trim()).filter(Boolean);
  const targets: SshTarget[] = [];

  for (const key of keys) {
    const connections = config.servers[key];
    if (!connections?.length) {
      throw new Error(
        `Unknown server "${key}". Defined servers: ${Object.keys(config.servers).join(", ") || "(none)"}`
      );
    }
    for (const connection of connections) {
      const parsed = parseConnectionString(connection);
      targets.push({
        serverKey: key,
        connection,
        ...parsed,
      });
    }
  }

  return targets;
}

/** Parse `# @servers a=host b=user@host` token pairs. */
export function parseServersDirective(value: string): Record<string, string[]> {
  const servers: Record<string, string[]> = {};
  const tokens = value.trim().split(/\s+/);

  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq === -1) continue;
    const name = token.slice(0, eq);
    const host = token.slice(eq + 1);
    servers[name] = servers[name] ?? [];
    servers[name]!.push(host);
  }

  return servers;
}
