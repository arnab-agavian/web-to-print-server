import { catalog } from "./catalog.js";

export const demoOrders = [
  {
    id: "20520000-0000-4000-8000-000000000001",
    order_number: "DH-2052",
    customer_id: "demo-customer",
    customer_name: "Maya Brooks",
    customer_email: "maya@example.com",
    product_id: catalog[2].id,
    product_name: "MTB Boards",
    quantity: 40,
    total: 486.4,
    status: "proof",
    proof_status: "awaiting_approval",
    production_ready: false,
    due_at: "2026-11-20T12:00:00Z",
    created_at: "2026-11-19T04:12:00Z",
  },
  {
    id: "20510000-0000-4000-8000-000000000001",
    order_number: "DH-2051",
    customer_id: "customer-fieldwork",
    customer_name: "Fieldwork Studio",
    customer_email: "orders@fieldwork.example",
    product_id: catalog[5].id,
    product_name: "Laser-cut Work",
    quantity: 12,
    total: 614.16,
    status: "production",
    proof_status: "approved",
    production_ready: true,
    due_at: "2026-11-19T12:00:00Z",
    created_at: "2026-11-18T07:12:00Z",
  },
];

export const demoProofs = [
  {
    id: "proof-demo-2",
    order_id: demoOrders[0].id,
    version: 2,
    status: "pending",
    preview_url: null,
    created_at: "2026-11-19T04:42:00Z",
  },
];

export const demoNotifications = [];

export const demoUserActivities = [];
