import { NextRequest, NextResponse } from "next/server";
import {
  appendTeamMessage,
  getTeamMessages,
  routeMention,
  runTeamTurn,
} from "@/lib/team";

export const maxDuration = 600;

export async function GET() {
  return NextResponse.json({ messages: getTeamMessages() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  appendTeamMessage("gordon", message);
  try {
    const reply = await runTeamTurn(routeMention(message));
    return NextResponse.json({ reply });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    appendTeamMessage("system", `(${routeMention(message)} couldn't reply: ${detail})`);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
