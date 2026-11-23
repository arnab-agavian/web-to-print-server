import test from "node:test";
import assert from "node:assert/strict";
import {
  notificationIdSchema,
  notificationQuerySchema,
} from "../src/validation/notification.validation.js";

test("notification list query applies pagination and unread defaults", () => {
  assert.deepEqual(notificationQuerySchema.parse({}), {
    limit: 20,
    offset: 0,
    unreadOnly: false,
  });
  assert.deepEqual(
    notificationQuerySchema.parse({
      limit: "10",
      offset: "5",
      unreadOnly: "true",
      type: "proof_ready",
    }),
    { limit: 10, offset: 5, unreadOnly: true, type: "proof_ready" },
  );
});

test("notification query rejects unsafe or ambiguous filters", () => {
  assert.throws(() => notificationQuerySchema.parse({ limit: "0" }));
  assert.throws(() => notificationQuerySchema.parse({ limit: "101" }));
  assert.throws(() => notificationQuerySchema.parse({ unreadOnly: "yes" }));
  assert.throws(() => notificationQuerySchema.parse({ type: "Proof Ready" }));
  assert.throws(() => notificationQuerySchema.parse({ recipientId: "someone" }));
});

test("notification IDs must be UUIDs", () => {
  assert.equal(
    notificationIdSchema.parse("11111111-1111-4111-8111-111111111111"),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.throws(() => notificationIdSchema.parse("notification-1"));
});
