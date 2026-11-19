import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.email.apiKey ? new Resend(env.email.apiKey) : null;

export function createEmailSender({
  client = resend,
  enabled = env.email.enabled,
  from = env.email.from,
  logger = console,
} = {}) {
  return async function sendEmail({
    to,
    subject,
    html,
    text,
    idempotencyKey,
  }) {
    if (!to) return { status: "skipped", reason: "missing_recipient" };
    if (!enabled) return { status: "skipped", reason: "email_disabled" };
    if (!client || !from) {
      logger.warn("Email skipped: Resend is not fully configured.");
      return { status: "skipped", reason: "email_not_configured" };
    }

    try {
      const { data, error } = await client.emails.send(
        { from, to: [to], subject, html, text },
        idempotencyKey ? { idempotencyKey } : undefined,
      );
      if (error) {
        logger.error(`Resend delivery failed: ${error.message || "Unknown error"}`);
        return { status: "failed", error: error.message || "Unknown error" };
      }
      return { status: "sent", id: data?.id || null };
    } catch (error) {
      logger.error(`Resend delivery failed: ${error.message}`);
      return { status: "failed", error: error.message };
    }
  };
}

export const sendEmail = createEmailSender();
