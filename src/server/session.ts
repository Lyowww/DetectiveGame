import "server-only";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { ensureDb } from "@/server/db";
import { ensureProfile } from "@/server/game";

export async function currentUser() {
  await ensureDb();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const profile = await ensureProfile(session.user.id, session.user.name);
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    guest: Boolean(session.user.isAnonymous),
    profile,
  };
}
