import test from "node:test";
import assert from "node:assert/strict";
import { swaggerSpec } from "../src/config/swagger.js";

test("Swagger uses a complete API base URL", () => {
  assert.match(swaggerSpec.servers[0].url, /^https?:\/\//);
  assert.match(swaggerSpec.servers[0].url, /\/api$/);
});

test("Swagger exposes every API operation", () => {
  const operations = [
    ["/health", "get"],
    ["/auth/signup", "post"],
    ["/auth/login", "post"],
    ["/auth/refresh", "post"],
    ["/auth/logout", "post"],
    ["/auth/me", "get"],
    ["/products", "get"],
    ["/products", "post"],
    ["/products/{slug}", "get"],
    ["/products/{slug}", "put"],
    ["/products/price", "post"],
    ["/products/{slug}/templates", "get"],
    ["/products/{slug}/templates", "post"],
    ["/templates/{id}", "get"],
    ["/templates/{id}", "put"],
    ["/templates/{id}", "delete"],
    ["/designs", "get"],
    ["/designs", "post"],
    ["/designs/{id}", "get"],
    ["/designs/{id}", "put"],
    ["/designs/{id}", "delete"],
    ["/files", "delete"],
    ["/files/upload", "post"],
    ["/files/signed-url", "post"],
    ["/cart", "get"],
    ["/cart", "delete"],
    ["/cart/items", "post"],
    ["/cart/items/{id}", "put"],
    ["/cart/items/{id}", "delete"],
    ["/addresses", "get"],
    ["/addresses", "post"],
    ["/addresses/{id}", "get"],
    ["/addresses/{id}", "put"],
    ["/addresses/{id}", "delete"],
    ["/addresses/{id}/default", "put"],
    ["/orders", "get"],
    ["/orders", "post"],
    ["/orders/{id}", "get"],
    ["/orders/{id}/reorder", "post"],
    ["/proofs/orders/{orderId}", "post"],
    ["/proofs/{id}/approve", "post"],
    ["/proofs/{id}/change-request", "post"],
    ["/admin/customers", "get"],
    ["/admin/jobs", "get"],
    ["/admin/jobs/{id}/status", "put"],
    ["/admin/jobs/{id}/production-file", "get"],
    ["/admin/analytics", "get"],
  ];
  for (const [path, method] of operations) {
    assert.ok(swaggerSpec.paths[path]?.[method], `${method.toUpperCase()} ${path}`);
  }
});

test("every Swagger component schema reference resolves", () => {
  const refs = JSON.stringify(swaggerSpec).match(
    /#\/components\/schemas\/[A-Za-z0-9]+/g,
  ) ?? [];
  const missing = [
    ...new Set(
      refs
        .map((ref) => ref.split("/").at(-1))
        .filter((name) => !swaggerSpec.components.schemas[name]),
    ),
  ];
  assert.deepEqual(missing, []);
});
