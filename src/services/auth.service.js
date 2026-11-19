import { env } from "../config/env.js";
import {
  createSupabaseAuthClient,
  supabase,
} from "../../supabase/supabase.js";

function serviceError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireClient(createClient) {
  const client = createClient();
  if (!client) {
    throw serviceError(
      "Supabase Auth is not configured on the server.",
      503,
      "auth_not_configured",
    );
  }
  return client;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name || null,
    phone: user.user_metadata?.phone || null,
    role: user.user_metadata?.role || "customer",
    emailConfirmedAt: user.email_confirmed_at || null,
    createdAt: user.created_at,
  };
}

function publicSession(session) {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    expiresIn: session.expires_in,
    tokenType: session.token_type,
  };
}

function authResult(data) {
  return {
    user: publicUser(data.user),
    session: publicSession(data.session),
    requiresEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export function createAuthService({
  createClient = createSupabaseAuthClient,
  adminClient = supabase,
  demoMode = env.demoMode,
} = {}) {
  return {
    async signup({ email, password, fullName, phone, role }) {
      const client = requireClient(createClient);
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone, role },
        },
      });
      if (error) {
        throw serviceError(
          error.message || "Unable to create account.",
          error.status || 400,
          error.code,
        );
      }
      return authResult(data);
    },

    async login({ email, password }) {
      const client = requireClient(createClient);
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw serviceError(
          "Invalid email or password.",
          401,
          error.code || "invalid_credentials",
        );
      }
      return authResult(data);
    },

    async refresh(refreshToken) {
      const client = requireClient(createClient);
      const { data, error } = await client.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (error || !data.session) {
        throw serviceError(
          "Invalid or expired refresh token.",
          401,
          error?.code || "invalid_refresh_token",
        );
      }
      return authResult(data);
    },

    async logout(accessToken) {
      if (demoMode && !accessToken) return { loggedOut: true, demo: true };
      if (!adminClient) {
        throw serviceError(
          "Supabase server credentials are not configured.",
          503,
          "auth_admin_not_configured",
        );
      }
      const { error } = await adminClient.auth.admin.signOut(
        accessToken,
        "global",
      );
      if (error) {
        throw serviceError(
          error.message || "Unable to log out.",
          error.status || 400,
          error.code,
        );
      }
      return { loggedOut: true };
    },
  };
}

const authService = createAuthService();
export default authService;
