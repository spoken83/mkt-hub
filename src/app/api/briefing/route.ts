import { NextResponse } from "next/server";
import { runBriefing } from "@/lib/briefing";
import { loadSettings } from "@/lib/settings";

export const maxDuration = 600;

/** Manual "run briefing now" trigger from the Settings screen. */
export async function POST() {
  try {
    const settings = loadSettings();
    await runBriefing(settings.verticals, settings.businessContext);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
