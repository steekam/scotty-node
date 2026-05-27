export class LogBuffer {
  private stdout: string[] = [];
  private stderr: string[] = [];

  appendStdout(chunk: string): void {
    if (chunk) this.stdout.push(chunk);
  }

  appendStderr(chunk: string): void {
    if (chunk) this.stderr.push(chunk);
  }

  getStdout(): string {
    return this.stdout.join("");
  }

  getStderr(): string {
    return this.stderr.join("");
  }

  clear(): void {
    this.stdout = [];
    this.stderr = [];
  }
}
