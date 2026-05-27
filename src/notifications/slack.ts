import { postJson } from "./http.js";

export async function sendSlackNotification(
  params: Record<string, string>
): Promise<void> {
  const url = params.url;
  if (!url) return;

  const body: Record<string, unknown> = {
    text: params.message ?? "Scotty deployment notification",
  };

  if (params.channel) {
    body.channel = params.channel;
  }

  await postJson(url, body, "Slack");
}
