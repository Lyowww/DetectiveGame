import { NextResponse } from "next/server";
import { adminAuthorized } from "@/server/ai/admin";
import { connectionTest, diagnosticsReport } from "@/server/ai/diagnostics";
import { getCatalog } from "@/server/ai/catalog";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!adminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("refresh") === "1") {
    await getCatalog({ force: true });
  }
  return NextResponse.json(await diagnosticsReport());
}

export async function POST(request: Request) {
  if (!adminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === "refresh") {
    const catalog = await getCatalog({ force: true });
    return NextResponse.json({ ok: true, eligibleCount: catalog.eligible.length, fetchedAt: catalog.fetchedAt });
  }
  if (body.action === "test") {
    const user = await currentUser();
    const result = await connectionTest(user?.id ?? "admin-test");
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
