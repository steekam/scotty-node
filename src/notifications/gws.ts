import { postJson } from "./http.js";

/**
 * Google Workspace Chat (incoming webhook).
 * @see https://developers.google.com/workspace/chat/quickstart/webhooks
 */
export async function sendGwsNotification(
  params: Record<string, string>
): Promise<void> {
  const url = params.url;
  if (!url) return;

  const body: Record<string, unknown> = {
    text: params.message ?? "Scotty deployment notification",
  };

  if (params.thread_key) {
    body.thread = { threadKey: params.thread_key };
  }

  await postJson(url, body, "Google Workspace Chat");
}
