/**
 * Interpolate $var and ${var} references using options and context state.
 * Option keys are matched case-sensitively; also checks UPPER_SNAKE for bash-style names.
 */
export function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\$\{?(\w+)\}?/g, (match, key: string) => {
    if (key in vars) return vars[key]!;
    const upper = key.toUpperCase();
    if (upper in vars) return vars[upper]!;
    const lower = key.toLowerCase();
    if (lower in vars) return vars[lower]!;
    return match;
  });
}

export function buildInterpolationContext(
  options: Record<string, string>,
  context: Record<string, string> = {}
): Record<string, string> {
  const ctx: Record<string, string> = { ...context };
  for (const [key, value] of Object.entries(options)) {
    ctx[key] = value;
    ctx[key.toUpperCase()] = value;
  }
  return ctx;
}
