import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { loadCalendar, updateEntry } from "./calendar";
import { getAgent } from "./agents";
import { sendToProfile } from "./hermes/chat";
import { appendTeamMessage } from "./team";
import type { TeamMessage } from "./team-shared";

// Per-post discussion threads ("tickets"): iterate on a calendar entry with
// the agents until Gordon confirms it for scheduling. Stateless agent turns —
// each turn gets the full entry context + thread, no session reuse needed.
const THREADS_FILE = path.join(process.cwd(), ".data", "post-threads.json");

type ThreadMap = Record<string, TeamMessage[]>;

function loadThreads(): ThreadMap {
  try {
    return JSON.parse(fs.readFileSync(THREADS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveThreads(map: ThreadMap): void {
  fs.mkdirSync(path.dirname(THREADS_FILE), { recursive: true });
  fs.writeFileSync(THREADS_FILE, JSON.stringify(map, null, 2));
}

export function getPostThread(entryId: string): TeamMessage[] {
  return loadThreads()[entryId] ?? [];
}

function append(
  entryId: string,
  author: TeamMessage["author"],
  content: string
): TeamMessage {
  const map = loadThreads();
  const message: TeamMessage = {
    id: randomUUID().slice(0, 12),
    author,
    content,
    createdAt: new Date().toISOString(),
  };
  map[entryId] = [...(map[entryId] ?? []), message];
  saveThreads(map);
  return message;
}

const NAMES: Record<string, string> = {
  gordon: "Gordon",
  mara: "Mara",
  kai: "Kai",
  system: "System",
};

/** Creative discussion defaults to Kai; @Mara pulls in the manager. */
function routePostMention(message: string): "mara" | "kai" {
  if (/@mara\b/i.test(message)) return "mara";
  return "kai";
}

export async function postToThread(
  entryId: string,
  message: string
): Promise<TeamMessage> {
  const entry = loadCalendar().find((e) => e.id === entryId);
  if (!entry) throw new Error("entry not found");

  append(entryId, "gordon", message);
  const agentId = routePostMention(message);
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`unknown agent ${agentId}`);

  const thread = getPostThread(entryId);
  const transcript = thread
    .map((m) => `${NAMES[m.author]}: ${m.content}`)
    .join("\n\n");

  const prompt = [
    `[Post discussion — Marketing Hub] You are ${agent.name}. Gordon is reviewing a specific content-calendar post with you. Reply with only your message to the discussion (no name prefix).`,
    `The post under discussion (calendar entry id ${entry.id}):\n${JSON.stringify(
      {
        title: entry.title,
        date: entry.date,
        status: entry.status,
        vertical: entry.vertical,
        contentType: entry.contentType,
        notes: entry.notes,
        kanbanTaskId: entry.kanbanTaskId,
        driveFileIds: entry.driveLinks,
      },
      null,
      2
    )}`,
    `Discussion so far:\n\n${transcript}`,
    agentId === "kai"
      ? "If Gordon asks for changes to the creative: actually make them (regenerate/edit the files, upload the new versions to the campaign folder per the marketing-assets skill, and update this calendar entry's driveLinks via the hub-calendar skill), then summarise what changed. Small copy tweaks to captions count too."
      : "If scheduling or strategy changes, update the calendar entry via the hub-calendar skill and say what you changed.",
  ].join("\n\n");

  const { reply } = await sendToProfile(agent.hermesProfile, prompt);
  return append(entryId, agentId, reply);
}

/** Gordon signs off: planned → scheduled, team + Mara get notified. */
export function confirmPost(entryId: string): void {
  const entry = loadCalendar().find((e) => e.id === entryId);
  if (!entry) throw new Error("entry not found");
  updateEntry(entryId, { status: "scheduled" });
  append(
    entryId,
    "system",
    `Gordon confirmed this post. Scheduled for ${entry.date} — Mara will publish it via Composio and mark it posted.`
  );
  appendTeamMessage(
    "system",
    `Gordon confirmed “${entry.title}” for ${entry.date}. Mara: publish it via Composio on the day, then mark the calendar entry posted.`
  );
}
