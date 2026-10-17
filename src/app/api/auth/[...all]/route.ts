import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";
import { ensureDb } from "@/server/db";

export const runtime = "nodejs";

const handler = toNextJsHandler(auth);

async function wrap(request: Request, method: "GET" | "POST") {
  await ensureDb();
  return handler[method](request);
}

export const GET = (request: Request) => wrap(request, "GET");
export const POST = (request: Request) => wrap(request, "POST");
