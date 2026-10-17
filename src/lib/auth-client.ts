"use client";

import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});

export async function ensureSession() {
  const current = await authClient.getSession();
  if (current.data?.user) return current.data;
  const created = await authClient.signIn.anonymous();
  if (created.error) throw new Error(created.error.message ?? "Could not start a guest session.");
  const again = await authClient.getSession();
  if (!again.data?.user) throw new Error("Could not start a guest session.");
  return again.data;
}
