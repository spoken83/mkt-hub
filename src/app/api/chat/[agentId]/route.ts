import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getAgent } from "@/lib/agents";
import { extractApproval } from "@/lib/approval";
import { hermesConfig } from "@/lib/hermes/config";
import { sendToProfile } from "@/lib/hermes/chat";
import { getSessionMessages } from "@/lib/hermes/sessions";
import { getThreadSession, setThreadSession } from "@/lib/hermes/threads";

export const maxDuration = 300;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await ctx.params;
  const agent = getAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 404 });
  }

  const sessionId = getThreadSession(agentId);
  if (!sessionId || !fs.existsSync(hermesConfig.profileStateDb(agent.hermesProfile))) {
    return NextResponse.json({ messages: [] });
  }
  const messages = getSessionMessages(agent.hermesProfile, sessionId, agentId);
  return NextResponse.json({ messages });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await ctx.params;
  const agent = getAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  try {
    const { reply, sessionId } = await sendToProfile(
      agent.hermesProfile,
      message,
      getThreadSession(agentId)
    );
    setThreadSession(agentId, sessionId);

    const { text, approval } = extractApproval(reply);
    return NextResponse.json({
      reply: {
        id: `reply-${Date.now()}`,
        agentId,
        role: "agent",
        content: text,
        createdAt: new Date().toISOString(),
        approval,
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
