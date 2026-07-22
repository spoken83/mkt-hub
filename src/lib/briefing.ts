import { getAgent } from "./agents";
import { sendToProfile } from "./hermes/chat";
import { getThreadSession, setThreadSession } from "./hermes/threads";
import { loadSettings, saveSettings } from "./settings";

// Gordon's WhatsApp LID on Pip's bridge (see INFRASTRUCTURE / hermes notes).
const PIP_BRIDGE_SEND = "http://localhost:3000/send";
const GORDON_CHAT_ID = "45711353769993@lid";

function localDateString(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Called every minute by the scheduler in instrumentation.ts. */
export async function briefingTick(now = new Date()): Promise<void> {
  const settings = loadSettings();
  const { briefing } = settings;
  if (!briefing.enabled) return;

  const today = localDateString(now);
  if (briefing.lastRunDate === today) return;

  const [hh, mm] = briefing.time.split(":").map(Number);
  const due = now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= mm);
  if (!due) return;

  // Mark as run first so a slow/failed run doesn't refire every minute.
  settings.briefing.lastRunDate = today;
  saveSettings(settings);

  try {
    await runBriefing(settings.verticals, settings.businessContext);
    if (briefing.whatsappNudge) {
      await sendNudge(
        "Mara has this week's storyboard ready for you in the Marketing Hub."
      );
    }
    console.log(`[briefing] daily briefing completed for ${today}`);
  } catch (err) {
    console.error("[briefing] failed:", err);
    if (briefing.whatsappNudge) {
      await sendNudge(
        "Mara's daily briefing hit an error — check the Marketing Hub logs."
      ).catch(() => {});
    }
  }
}

export async function runBriefing(
  verticals: string[],
  businessContext: string
): Promise<void> {
  const mara = getAgent("mara");
  if (!mara) throw new Error("mara persona missing");

  const prompt = [
    "Good morning. Run your daily routine now (mm-daily-routine): check the calendar and industry news, then prepare this week's storyboard options for my approval.",
    verticals.length
      ? `Focus verticals right now: ${verticals.join(", ")}.`
      : "",
    businessContext ? `Current business context from Gordon: ${businessContext}` : "",
    "Present the storyboard options as an approval card. I will review them here in the Marketing Hub.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { sessionId } = await sendToProfile(
    mara.hermesProfile,
    prompt,
    getThreadSession("mara")
  );
  setThreadSession("mara", sessionId);
}

async function sendNudge(message: string): Promise<void> {
  const res = await fetch(PIP_BRIDGE_SEND, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: GORDON_CHAT_ID, message }),
  });
  if (!res.ok) throw new Error(`bridge send failed: ${res.status}`);
}
