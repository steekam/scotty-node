export interface ScottyConfig {
  servers: Record<string, string | string[]>;
  options?: Record<string, string | number | boolean>;
  local?: (
    options: Record<string, unknown>
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  tasks?: Record<string, ScottyTask>;
  macros?: Record<string, string[]>;
  notifications?: Record<string, Record<string, unknown>>;
  hooks?: Record<
    string,
    (
      ...args: unknown[]
    ) => Promise<void> | void
  >;
}

export interface ScottyTask {
  on?: string | ((options: Record<string, unknown>) => string);
  parallel?: boolean;
  confirm?: string | ((options: Record<string, unknown>) => string);
  run: string | ((options: Record<string, unknown>, local: Record<string, unknown>) => string);
}
