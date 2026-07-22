// Client-safe types and constants for marketing settings (no node imports).

export interface MarketingSettings {
  briefing: {
    enabled: boolean;
    /** 24h local time on the Mac mini (SGT), e.g. "08:00" */
    time: string;
    /** Send a one-line nudge to Gordon via Pip's WhatsApp bridge */
    whatsappNudge: boolean;
    /** Date (YYYY-MM-DD local) the briefing last ran, to avoid double-fires */
    lastRunDate?: string;
  };
  /** Verticals Mara should focus storyboards on */
  verticals: string[];
  /** Free-text business context injected into every briefing prompt */
  businessContext: string;
}

export const ALL_VERTICALS = [
  "education",
  "construction",
  "F&B",
  "distribution",
  "fitness",
  "insurance/real estate",
  "general SME",
];
