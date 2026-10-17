import "server-only";
import fs from "fs";
import path from "path";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { db, migrateUserData } from "@/server/db";
import { authSchema } from "@/server/db/schema";

export function authSecret() {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  const file = path.join(process.cwd(), ".data", "auth-secret");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const value = crypto.randomUUID() + crypto.randomUUID();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value, { mode: 0o600 });
  return value;
}

function trustedOrigins() {
  const origins = new Set<string>();
  for (const value of [process.env.BETTER_AUTH_URL, process.env.APP_URL]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      /* ignore bad env */
    }
  }
  if (process.env.VERCEL_URL) origins.add(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) origins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return [...origins];
}

export const auth = betterAuth({
  secret: authSecret(),
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000",
  trustedOrigins: trustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: { enabled: true },
  plugins: [
    anonymous({
      emailDomainName: "guest.casefile.invalid",
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await migrateUserData(anonymousUser.user.id, newUser.user.id);
      },
    }),
    nextCookies(),
  ],
});
