import { NextResponse } from "next/server";
import { speechConfigured, transcribe } from "@/server/speech";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!speechConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "Transcription is not configured. Type the question instead. Audio is not stored.",
      },
      { status: 503 },
    );
  }
  const form = await request.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No recording was uploaded." }, { status: 400 });
  try {
    const text = await transcribe(file, "recording.webm");
    return NextResponse.json({ configured: true, text });
  } catch {
    return NextResponse.json({ configured: true, error: "Transcription failed. Your typed draft is unchanged." }, { status: 502 });
  }
}
