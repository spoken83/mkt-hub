import { NextRequest, NextResponse } from "next/server";
import { confirmPost, getPostThread, postToThread } from "@/lib/post-thread";

export const maxDuration = 600;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return NextResponse.json({ messages: getPostThread(id) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);

  if (body?.action === "confirm") {
    try {
      confirmPost(id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: detail }, { status: 400 });
    }
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  try {
    const reply = await postToThread(id, message);
    return NextResponse.json({ reply });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
