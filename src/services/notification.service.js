import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { sendEmail } from "./email.service.js";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const value = (record, camel, snake) => record?.[camel] ?? record?.[snake];
const orderNumber = (order) => value(order, "orderNumber", "order_number") || order?.id;
const total = (order) => Number(order?.total || 0).toFixed(2);
const emailFrame = (title, content) => `
<!doctype html>
<html><body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:620px;margin:32px auto;background:#fff;border-radius:12px;padding:32px">
    <div style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#ff5c35">DIGITAL HEROES</div>
    <h1 style="font-size:24px;margin:12px 0 20px">${escapeHtml(title)}</h1>
    ${content}
    <p style="margin-top:28px;color:#657086;font-size:13px">This is an automated transactional message.</p>
  </div>
</body></html>`;

const shortHash = (input) =>
  createHash("sha256").update(String(input)).digest("hex").slice(0, 16);

export async function notifyOrderPlaced({ order, user, reordered = false }) {
  const number = orderNumber(order);
  const subject = reordered
    ? `Reorder ${number} received`
    : `Order ${number} received`;
  return sendEmail({
    to: user?.email,
    subject,
    idempotencyKey: `${reordered ? "reorder" : "order"}-placed/${order.id}`,
    text: `${subject}. Total: ${order.currency || "INR"} ${total(order)}.`,
    html: emailFrame(
      subject,
      `<p>Hi ${escapeHtml(user?.fullName || "there")},</p>
       <p>We have received your ${reordered ? "reorder" : "order"}.</p>
       <p><strong>Order:</strong> ${escapeHtml(number)}<br>
       <strong>Total:</strong> ${escapeHtml(order.currency || "INR")} ${total(order)}</p>`,
    ),
  });
}

export async function notifyProofReady({ proof, order, recipient }) {
  const number = orderNumber(order);
  return sendEmail({
    to: recipient?.email,
    subject: `Proof ready for ${number}`,
    idempotencyKey: `proof-ready/${proof.id}`,
    text: `Proof version ${proof.version} is ready for order ${number}.`,
    html: emailFrame(
      `Proof ready for ${number}`,
      `<p>Hi ${escapeHtml(recipient?.fullName || "there")},</p>
       <p>Proof version <strong>${proof.version}</strong> is ready for your review.</p>
       <p>Please sign in to approve it or request changes.</p>`,
    ),
  });
}

export async function notifyProofApproved({ proof, order, user }) {
  const number = orderNumber(order) || proof.orderId || proof.order_id;
  return sendEmail({
    to: user?.email,
    subject: `Proof approved for ${number}`,
    idempotencyKey: `proof-approved/${proof.id}`,
    text: `Proof version ${proof.version} was approved for order ${number}.`,
    html: emailFrame(
      `Proof approved for ${number}`,
      `<p>Thanks ${escapeHtml(user?.fullName || "")}. Proof version <strong>${proof.version}</strong> has been approved and the job can proceed to production.</p>`,
    ),
  });
}

export async function notifyProofChangesRequested({ proof, order, message, user }) {
  const number = orderNumber(order) || proof.orderId || proof.order_id;
  const key = shortHash(message);
  await Promise.all([
    sendEmail({
      to: user?.email,
      subject: `Change request received for ${number}`,
      idempotencyKey: `proof-change-customer/${proof.id}/${key}`,
      text: `Your change request for order ${number} has been received: ${message}`,
      html: emailFrame(
        `Change request received for ${number}`,
        `<p>We received your requested changes:</p><p style="padding:14px;background:#f5f7fa;border-radius:8px">${escapeHtml(message)}</p>`,
      ),
    }),
    sendEmail({
      to: env.email.admin,
      subject: `Proof changes requested for ${number}`,
      idempotencyKey: `proof-change-admin/${proof.id}/${key}`,
      text: `${user?.email || "A customer"} requested changes for ${number}: ${message}`,
      html: emailFrame(
        `Proof changes requested for ${number}`,
        `<p><strong>${escapeHtml(user?.email || "A customer")}</strong> requested:</p><p style="padding:14px;background:#f5f7fa;border-radius:8px">${escapeHtml(message)}</p>`,
      ),
    }),
  ]);
}

export async function notifyOrderStatusChanged({ order, recipient }) {
  const number = orderNumber(order);
  const status = String(order.status || "updated");
  const revision = value(order, "updatedAt", "updated_at") || status;
  return sendEmail({
    to: recipient?.email,
    subject: `${number} is now ${status}`,
    idempotencyKey: `order-status/${order.id}/${status}/${shortHash(revision)}`,
    text: `Order ${number} is now ${status}.`,
    html: emailFrame(
      `Order update: ${number}`,
      `<p>Hi ${escapeHtml(recipient?.fullName || "there")},</p><p>Your order is now <strong>${escapeHtml(status)}</strong>.</p>`,
    ),
  });
}
