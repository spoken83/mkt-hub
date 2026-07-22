import fs from "node:fs";
import path from "node:path";
import type { MarketingSettings } from "./settings-shared";

// Marketing settings owned by the Hub (replaces the Hermes MM cron, which
// Gordon stopped). Engine config (models, skills) stays in Hermes.
export type { MarketingSettings };

const SETTINGS_FILE = path.join(process.cwd(), ".data", "settings.json");

const DEFAULTS: MarketingSettings = {
  briefing: { enabled: false, time: "08:00", whatsappNudge: true },
  verticals: ["education", "construction", "general SME"],
  businessContext: "",
};

export function loadSettings(): MarketingSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    return {
      ...DEFAULTS,
      ...raw,
      briefing: { ...DEFAULTS.briefing, ...raw.briefing },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveSettings(settings: MarketingSettings): void {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
