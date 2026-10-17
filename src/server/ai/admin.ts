import "server-only";
import { openRouterConfig } from "@/server/ai/config";

export function adminAuthorized(request: Request) {
  const cfg = openRouterConfig();
  if (!cfg.adminToken) return false;
  const header = request.headers.get("x-casefile-admin") || request.headers.get("authorization") || "";
  if (header === cfg.adminToken) return true;
  if (header.toLowerCase().startsWith("bearer ") && header.slice(7).trim() === cfg.adminToken) return true;
  const url = new URL(request.url);
  return url.searchParams.get("token") === cfg.adminToken;
}
