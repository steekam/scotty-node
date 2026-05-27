export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  event: string;
  level?: LogLevel;
  task?: string;
  server?: string;
  host?: string;
  attempt?: number;
  durationMs?: number;
  error?: string;
  [key: string]: string | number | boolean | undefined;
}

const SENSITIVE_KEY = /(password|secret|token|pass|api[_-]?key|private[_-]?key|authorization)/i;
const WEBHOOK_URL = /hooks\.(slack|discord)|api\.telegram\.org/i;

export function isJsonLogging(): boolean {
  return process.env.SCOTTY_LOG_JSON === "1";
}

/** Structured ops log — JSON lines on stderr when SCOTTY_LOG_JSON=1, otherwise silent (Clack owns UX). */
export function logEvent(
  event: string,
  message?: string,
  fields: Omit<LogFields, "event" | "message"> = {}
): void {
  if (!isJsonLogging()) return;

  const payload = redactFields({
    ts: new Date().toISOString(),
    event,
    message,
    level: fields.level ?? "info",
    ...fields,
  });

  console.error(JSON.stringify(payload));
}

export function redactFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      out[key] = redactValue(key, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function redactValue(key: string, value: string): string {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (key === "url" && WEBHOOK_URL.test(value)) {
    try {
      const u = new URL(value);
      return `${u.origin}${u.pathname.slice(0, 12)}…`;
    } catch {
      return "[REDACTED_URL]";
    }
  }
  return value;
}
