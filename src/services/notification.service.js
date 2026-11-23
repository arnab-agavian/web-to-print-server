import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { sendEmail } from "./email.service.js";
import {
  createAdminNotifications,
  createNotification,
  deliverInAppNotifications,
} from "./in-app-notification.service.js";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const value = (record, camel, snake) => record?.[camel] ?? record?.[snake];
const orderNumber = (order) => value(order, "orderNumber", "order_number") || order?.id;
const customerId = (order, recipient) =>
  value(order, "customerId", "customer_id") || recipient?.id;
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
  const eventType = reordered ? "order_reordered" : "order_placed";
  const dedupeKey = `${eventType}/${order.id}`;
  const data = { orderId: order.id, orderNumber: number };
  await deliverInAppNotifications([
    () =>
      createNotification({
        recipientId: customerId(order, user),
        type: eventType,
        title: subject,
        message: `We received your ${reordered ? "reorder" : "order"} for ${order.currency || "INR"} ${total(order)}.`,
        data,
        dedupeKey,
      }),
    () =>
      createAdminNotifications({
        type: reordered ? "customer_reordered" : "new_order",
        title: `${reordered ? "New reorder" : "New order"}: ${number}`,
        message: `${user?.fullName || user?.email || "A customer"} placed ${number} for ${order.currency || "INR"} ${total(order)}.`,
        data: { ...data, customerId: customerId(order, user) },
        dedupeKey,
      }),
  ]);
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
  await deliverInAppNotifications([
    () =>
      createNotification({
        recipientId: customerId(order, recipient),
        type: "proof_ready",
        title: `Proof ready for ${number}`,
        message: `Proof version ${proof.version} is ready for your review.`,
        data: { orderId: order.id, orderNumber: number, proofId: proof.id },
        dedupeKey: `proof-ready/${proof.id}`,
      }),
  ]);
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
  const data = {
    orderId: order.id || proof.orderId || proof.order_id,
    orderNumber: number,
    proofId: proof.id,
  };
  await deliverInAppNotifications([
    () =>
      createNotification({
        recipientId: customerId(order, user),
        type: "proof_approved",
        title: `Proof approved for ${number}`,
        message: `Proof version ${proof.version} was approved and can proceed to production.`,
        data,
        dedupeKey: `proof-approved/${proof.id}`,
      }),
    () =>
      createAdminNotifications({
        type: "proof_approved",
        title: `Proof approved: ${number}`,
        message: `Proof version ${proof.version} was approved and is ready for production.`,
        data,
        dedupeKey: `proof-approved/${proof.id}`,
      }),
  ]);
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
  const data = {
    orderId: order.id || proof.orderId || proof.order_id,
    orderNumber: number,
    proofId: proof.id,
  };
  await deliverInAppNotifications([
    () =>
      createNotification({
        recipientId: customerId(order, user),
        type: "proof_changes_requested",
        title: `Change request received for ${number}`,
        message: "Your proof change request has been sent to the production team.",
        data,
        dedupeKey: `proof-change-customer/${proof.id}/${key}`,
      }),
    () =>
      createAdminNotifications({
        type: "proof_changes_requested",
        title: `Proof changes requested: ${number}`,
        message,
        data: { ...data, customerId: customerId(order, user) },
        dedupeKey: `proof-change-admin/${proof.id}/${key}`,
      }),
  ]);
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
  await deliverInAppNotifications([
    () =>
      createNotification({
        recipientId: customerId(order, recipient),
        type: "order_status_changed",
        title: `Order update: ${number}`,
        message: `Your order is now ${status}.`,
        data: { orderId: order.id, orderNumber: number, status },
        dedupeKey: `order-status/${order.id}/${status}/${shortHash(revision)}`,
      }),
  ]);
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
