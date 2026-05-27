import type { ConfigState, NotificationConfig } from "../types/configState.js";
import {
  buildInterpolationContext,
  interpolate,
} from "../utils/interpolate.js";
import { sendDiscordNotification } from "./discord.js";
import { sendEmailNotification } from "./email.js";
import { sendGwsNotification } from "./gws.js";
import { postJson } from "./http.js";
import { sendSlackNotification } from "./slack.js";
import { sendTelegramNotification } from "./telegram.js";

export async function dispatchNotifications(
  config: ConfigState,
  options: Record<string, string>,
  context: Record<string, string>
): Promise<void> {
  const interpolation = buildInterpolationContext(options, context);

  for (const notification of config.notifications) {
    const params = resolveNotificationParams(
      notification,
      options,
      context,
      interpolation
    );
    await sendNotification(notification.channel, params);
  }
}

function resolveNotificationParams(
  notification: NotificationConfig,
  options: Record<string, string>,
  context: Record<string, string>,
  interpolation: Record<string, string>
): Record<string, string> {
  const params: Record<string, string> = { ...notification.params };

  if (notification.resolvers) {
    for (const [key, resolver] of Object.entries(notification.resolvers)) {
      if (typeof resolver === "function") {
        params[key] = resolver(options, context);
      } else {
        params[key] = resolver;
      }
    }
  }

  for (const [key, value] of Object.entries(params)) {
    params[key] = interpolate(value, interpolation);
  }

  return params;
}

async function sendNotification(
  channel: NotificationConfig["channel"],
  params: Record<string, string>
): Promise<void> {
  switch (channel) {
    case "slack":
      await sendSlackNotification(params);
      break;
    case "discord":
      await sendDiscordNotification(params);
      break;
    case "gws":
      await sendGwsNotification(params);
      break;
    case "telegram":
      await sendTelegramNotification(params);
      break;
    case "email":
      await sendEmailNotification(params);
      break;
    case "webhook":
      if (params.url) {
        await postJson(
          params.url,
          { content: params.message ?? "" },
          "Webhook"
        );
      }
      break;
    default:
      break;
  }
}
