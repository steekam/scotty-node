import { logEvent } from "./logger.js";

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { retries: number; retryDelayMs: number }
): Promise<T> {
  const attempts = Math.max(1, opts.retries);
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (attempt > 1) {
        logEvent("retry", `${label} attempt ${attempt}/${attempts}`);
      }
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < attempts) {
        logEvent("retry", `${label} failed: ${lastError.message}`);
        await sleep(opts.retryDelayMs);
      }
    }
  }

  throw lastError ?? new Error(`${label} failed`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
