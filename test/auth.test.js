import test from "node:test";
import assert from "node:assert/strict";
import { createAuthService } from "../src/services/auth.service.js";
import {
  loginSchema,
  refreshSchema,
  signupSchema,
} from "../src/validation/auth.validation.js";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "maya@example.com",
  email_confirmed_at: "2026-11-20T10:00:00.000Z",
  created_at: "2026-11-20T09:00:00.000Z",
  user_metadata: { full_name: "Maya Brooks" },
};

const session = {
  access_token: "access-token",
  refresh_token: "refresh-token-with-enough-characters",
  expires_at: 1_795_171_600,
  expires_in: 3600,
  token_type: "bearer",
};

function fakeClient() {
  return {
    auth: {
      signUp: async () => ({ data: { user, session: null }, error: null }),
      signInWithPassword: async () => ({ data: { user, session }, error: null }),
      refreshSession: async () => ({ data: { user, session }, error: null }),
    },
  };
}

test("auth validation normalizes email and rejects weak passwords", () => {
  const signup = signupSchema.parse({
    email: "  MAYA@EXAMPLE.COM ",
    password: "StrongPassword123!",
    fullName: "Maya Brooks",
  });
  assert.equal(signup.email, "maya@example.com");
  assert.throws(() =>
    loginSchema.parse({ email: "maya@example.com", password: "short" }),
  );
  assert.doesNotThrow(() =>
    refreshSchema.parse({ refreshToken: "refresh-token-with-enough-characters" }),
  );
});

test("auth service returns public signup and login results", async () => {
  const service = createAuthService({
    createClient: fakeClient,
    adminClient: null,
    demoMode: false,
  });
  const signup = await service.signup({
    email: user.email,
    password: "StrongPassword123!",
    fullName: "Maya Brooks",
  });
  assert.equal(signup.requiresEmailConfirmation, true);
  assert.equal(signup.session, null);

  const login = await service.login({
    email: user.email,
    password: "StrongPassword123!",
  });
  assert.equal(login.session.accessToken, "access-token");
  assert.equal(login.user.fullName, "Maya Brooks");
});

test("auth service globally revokes the access token", async () => {
  let revoked;
  const service = createAuthService({
    createClient: fakeClient,
    adminClient: {
      auth: {
        admin: {
          signOut: async (token, scope) => {
            revoked = { token, scope };
            return { error: null };
          },
        },
      },
    },
    demoMode: false,
  });
  assert.deepEqual(await service.logout("access-token"), { loggedOut: true });
  assert.deepEqual(revoked, { token: "access-token", scope: "global" });
});
