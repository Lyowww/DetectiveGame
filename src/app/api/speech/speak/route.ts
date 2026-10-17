import { NextResponse } from "next/server";
import { z } from "zod";
import { speak, ttsConfigured } from "@/server/speech";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  characterId: z.string().max(40),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!ttsConfigured()) {
    return NextResponse.json({ configured: false, error: "Spoken replies are not configured. The transcript remains." }, { status: 503 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nothing to speak." }, { status: 400 });
  try {
    const audio = await speak(parsed.data.text, parsed.data.characterId);
    return new NextResponse(audio, {
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ configured: true, error: "Speech playback failed. The transcript remains." }, { status: 502 });
  }
}
