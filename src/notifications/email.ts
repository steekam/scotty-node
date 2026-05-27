import nodemailer from "nodemailer";

/**
 * SMTP email notifications.
 *
 * Params: to, from, subject, message, smtp_host, smtp_port, smtp_secure,
 * smtp_user, smtp_pass — or matching SMTP_* / MAIL_FROM env vars.
 */
export async function sendEmailNotification(
  params: Record<string, string>
): Promise<void> {
  const to = params.to;
  if (!to) return;

  const host = params.smtp_host ?? process.env.SMTP_HOST;
  if (!host) {
    throw new Error(
      "Email notification requires smtp_host param or SMTP_HOST environment variable"
    );
  }

  const port = Number(params.smtp_port ?? process.env.SMTP_PORT ?? 587);
  const secure =
    (params.smtp_secure ?? process.env.SMTP_SECURE ?? "false") === "true";
  const user = params.smtp_user ?? process.env.SMTP_USER;
  const pass = params.smtp_pass ?? process.env.SMTP_PASS;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: pass ?? "" } : undefined,
  });

  const message = params.message ?? "Scotty deployment notification";
  const useHtml = params.html === "true";

  await transport.sendMail({
    from:
      params.from ??
      process.env.MAIL_FROM ??
      process.env.SMTP_FROM ??
      "scotty-node@localhost",
    to: to.split(",").map((addr) => addr.trim()),
    subject: params.subject ?? "Scotty deployment notification",
    text: useHtml ? undefined : message,
    html: useHtml ? message : undefined,
  });
}
