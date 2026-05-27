import * as p from "@clack/prompts";

let assumeYes = false;

export function setAssumeYes(value: boolean): void {
  assumeYes = value;
}

export function shouldAssumeYes(): boolean {
  return (
    assumeYes ||
    process.env.SCOTTY_YES === "1" ||
    process.env.CI === "true"
  );
}

export async function confirmTask(message: string): Promise<boolean> {
  if (shouldAssumeYes()) return true;

  const answer = await p.confirm({ message });

  if (p.isCancel(answer)) return false;
  return Boolean(answer);
}
