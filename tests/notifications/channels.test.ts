import { describe, expect, it, vi, beforeEach } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "1" });
  const createTransport = vi.fn().mockReturnValue({ sendMail });
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { sendGwsNotification } from "../../src/notifications/gws.js";
import { sendTelegramNotification } from "../../src/notifications/telegram.js";
import { sendEmailNotification } from "../../src/notifications/email.js";

describe("sendGwsNotification", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" })
    );
  });

  it("POSTs Google Chat text payload to the webhook URL", async () => {
    await sendGwsNotification({
      url: "https://chat.googleapis.com/v1/spaces/AAA/messages?key=k&token=t",
      message: "Deployed production",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://chat.googleapis.com/v1/spaces/AAA/messages?key=k&token=t",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "Deployed production" }),
      })
    );
  });

  it("includes thread key when provided", async () => {
    await sendGwsNotification({
      url: "https://chat.googleapis.com/v1/spaces/AAA/messages?key=k&token=t",
      message: "hi",
      thread_key: "deploy-42",
    });

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body
    );
    expect(body.thread).toEqual({ threadKey: "deploy-42" });
  });
});

describe("sendTelegramNotification", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" })
    );
  });

  it("calls Telegram Bot API sendMessage", async () => {
    await sendTelegramNotification({
      token: "bot123",
      chat_id: "-100999",
      message: "Deploy done",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot123/sendMessage",
      expect.objectContaining({
        body: JSON.stringify({ chat_id: "-100999", text: "Deploy done" }),
      })
    );
  });
});

describe("sendEmailNotification", () => {
  beforeEach(() => {
    sendMail.mockClear();
    createTransport.mockClear();
  });

  it("sends mail via nodemailer transport", async () => {
    await sendEmailNotification({
      to: "ops@example.com",
      from: "scotty@example.com",
      subject: "Deploy",
      message: "All good",
      smtp_host: "smtp.example.com",
      smtp_port: "587",
      smtp_user: "user",
      smtp_pass: "pass",
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.example.com", port: 587 })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["ops@example.com"],
        subject: "Deploy",
        text: "All good",
      })
    );
  });
});
