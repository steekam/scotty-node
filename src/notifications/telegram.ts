import { postJson } from "./http.js";

/**
 * Telegram Bot API sendMessage.
 * @see https://core.telegram.org/bots/api#sendmessage
 */
export async function sendTelegramNotification(
  params: Record<string, string>
): Promise<void> {
  const token = params.token ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = params.chat_id ?? params.chat;
  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: params.message ?? "Scotty deployment notification",
  };

  if (params.parse_mode) {
    body.parse_mode = params.parse_mode;
  }

  if (params.disable_notification === "true") {
    body.disable_notification = true;
  }

  await postJson(url, body, "Telegram");
}
