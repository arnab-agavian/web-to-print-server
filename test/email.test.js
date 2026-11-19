import test from "node:test";
import assert from "node:assert/strict";
import { createEmailSender } from "../src/services/email.service.js";

test("email sender skips delivery when disabled", async () => {
  let called = false;
  const sendEmail = createEmailSender({
    enabled: false,
    from: "Digital Heroes <orders@example.com>",
    client: { emails: { send: async () => { called = true; } } },
  });
  const result = await sendEmail({
    to: "maya@example.com",
    subject: "Order received",
    html: "<p>Received</p>",
    text: "Received",
  });
  assert.deepEqual(result, { status: "skipped", reason: "email_disabled" });
  assert.equal(called, false);
});

test("email sender uses the Resend idempotency key", async () => {
  let request;
  const sendEmail = createEmailSender({
    enabled: true,
    from: "Digital Heroes <orders@example.com>",
    client: {
      emails: {
        send: async (message, options) => {
          request = { message, options };
          return { data: { id: "email_123" }, error: null };
        },
      },
    },
  });
  const result = await sendEmail({
    to: "maya@example.com",
    subject: "Order received",
    html: "<p>Received</p>",
    text: "Received",
    idempotencyKey: "order-placed/order_123",
  });
  assert.deepEqual(result, { status: "sent", id: "email_123" });
  assert.deepEqual(request.options, {
    idempotencyKey: "order-placed/order_123",
  });
  assert.deepEqual(request.message.to, ["maya@example.com"]);
});

test("email delivery failures do not throw into business transactions", async () => {
  const messages = [];
  const sendEmail = createEmailSender({
    enabled: true,
    from: "Digital Heroes <orders@example.com>",
    logger: { error: (message) => messages.push(message), warn() {} },
    client: {
      emails: {
        send: async () => ({ data: null, error: { message: "rate limited" } }),
      },
    },
  });
  const result = await sendEmail({
    to: "maya@example.com",
    subject: "Order received",
    html: "<p>Received</p>",
    text: "Received",
  });
  assert.deepEqual(result, { status: "failed", error: "rate limited" });
  assert.equal(messages.length, 1);
});
