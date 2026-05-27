import { postJson } from "./http.js";

export async function sendDiscordNotification(
  params: Record<string, string>
): Promise<void> {
  const url = params.url;
  if (!url) return;

  await postJson(
    url,
    { content: params.message ?? "Scotty deployment notification" },
    "Discord"
  );
}
