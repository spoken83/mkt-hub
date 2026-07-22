import type { AgentPersona } from "./types";

// Config-driven roster: add/edit personas here (or later, per-tenant config)
// without touching any component code.
export const AGENTS: AgentPersona[] = [
  {
    id: "mara",
    hermesProfile: "marketing-manager",
    name: "Mara",
    role: "Marketing Manager",
    tagline: "Strategy, storyboards & calendar",
    intro:
      "I run your marketing like a manager would: I track your business context and industry news, plan the weekly content calendar, storyboard campaign options, brief the creative team, and report on performance. I only stop to ask for your approval at key decision points.",
    starters: [
      "What's on the content calendar this week?",
      "Show me this week's storyboard options",
      "How did last week's posts perform?",
      "Plan a campaign for the education vertical",
    ],
    avatar: "/avatars/mara.png",
    accent: "#3A2BA8",
  },
  {
    id: "kai",
    hermesProfile: "marketing-creative",
    name: "Kai",
    role: "Creative",
    tagline: "Carousels, statics & copy",
    intro:
      "I turn briefs into finished creatives: multi-slide carousels, single-image statics, captions and hooks — all in APOP's brand voice. Send me a brief or ask me to iterate on something Mara has planned.",
    starters: [
      "What are you working on right now?",
      "Draft a caption for the InvoiceNow carousel",
      "Show me the latest artifacts",
      "How many Higgsfield credits do we have left?",
    ],
    avatar: "/avatars/kai.png",
    accent: "#0E7C66",
  },
];

export function getAgent(id: string): AgentPersona | undefined {
  return AGENTS.find((a) => a.id === id);
}
