import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { AGENTS } from "@/lib/agents";
import { hermesConfig } from "@/lib/hermes/config";
import { loadSettings, saveSettings, type MarketingSettings } from "@/lib/settings";

interface EngineInfo {
  agentId: string;
  profile: string;
  model: string;
}

function readEngineInfo(): EngineInfo[] {
  return AGENTS.map((agent) => {
    let model = "unknown";
    try {
      const configFile = path.join(
        hermesConfig.home,
        "profiles",
        agent.hermesProfile,
        "config.yaml"
      );
      const match = /^model:\s*\n\s+default:\s*(\S+)/m.exec(
        fs.readFileSync(configFile, "utf8")
      );
      if (match) model = match[1];
    } catch {
      // Profile config unreadable — leave as unknown.
    }
    return { agentId: agent.id, profile: agent.hermesProfile, model };
  });
}

export async function GET() {
  return NextResponse.json({ settings: loadSettings(), engine: readEngineInfo() });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    settings?: MarketingSettings;
  } | null;
  const incoming = body?.settings;
  if (
    !incoming ||
    typeof incoming.briefing?.enabled !== "boolean" ||
    !/^\d{2}:\d{2}$/.test(incoming.briefing?.time ?? "") ||
    !Array.isArray(incoming.verticals)
  ) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  // Preserve lastRunDate — the client doesn't own scheduler state.
  const current = loadSettings();
  const next: MarketingSettings = {
    briefing: {
      enabled: incoming.briefing.enabled,
      time: incoming.briefing.time,
      whatsappNudge: Boolean(incoming.briefing.whatsappNudge),
      lastRunDate: current.briefing.lastRunDate,
    },
    verticals: incoming.verticals.map(String),
    businessContext: String(incoming.businessContext ?? ""),
  };
  saveSettings(next);
  return NextResponse.json({ settings: next });
}
