import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { extractApproval } from "./approval";
import { getAgent } from "./agents";
import { sendToProfile } from "./hermes/chat";
import { getThreadSession, setThreadSession } from "./hermes/threads";
import type { TeamMessage } from "./team-shared";

// The team channel is Hub-orchestrated: one shared transcript; each agent
// turn runs in that agent's own Hermes session, fed the messages it hasn't
// seen yet (tracked per-agent via cursors).
interface TeamStore {
  messages: TeamMessage[];
  /** id of the last message each agent has been shown */
  cursors: Partial<Record<"mara" | "kai", string>>;
  /** kanban task id → last seen status, for the watcher */
  kanbanSeen: Record<string, string>;
}

const TEAM_FILE = path.join(process.cwd(), ".data", "team-chat.json");

function loadStore(): TeamStore {
  try {
    const raw = JSON.parse(fs.readFileSync(TEAM_FILE, "utf8"));
    return {
      messages: raw.messages ?? [],
      cursors: raw.cursors ?? {},
      kanbanSeen: raw.kanbanSeen ?? {},
    };
  } catch {
    return { messages: [], cursors: {}, kanbanSeen: {} };
  }
}

function saveStore(store: TeamStore): void {
  fs.mkdirSync(path.dirname(TEAM_FILE), { recursive: true });
  fs.writeFileSync(TEAM_FILE, JSON.stringify(store, null, 2));
}

export function getTeamMessages(): TeamMessage[] {
  return loadStore().messages;
}

export function appendTeamMessage(
  author: TeamMessage["author"],
  content: string,
  approval?: TeamMessage["approval"]
): TeamMessage {
  const store = loadStore();
  const message: TeamMessage = {
    id: randomUUID().slice(0, 12),
    author,
    content,
    createdAt: new Date().toISOString(),
    approval,
  };
  store.messages.push(message);
  saveStore(store);
  return message;
}

const AUTHOR_NAMES: Record<string, string> = {
  gordon: "Gordon",
  mara: "Mara",
  kai: "Kai",
  system: "System",
};

/** Messages the agent hasn't seen, rendered as an attributed transcript. */
function unseenTranscript(agentId: "mara" | "kai", store: TeamStore): string {
  const cursor = store.cursors[agentId];
  const idx = cursor ? store.messages.findIndex((m) => m.id === cursor) : -1;
  return store.messages
    .slice(idx + 1)
    .filter((m) => m.author !== agentId)
    .map((m) => `${AUTHOR_NAMES[m.author]}: ${m.content}`)
    .join("\n\n");
}

/**
 * Run one agent turn in the team channel: show the agent everything it
 * hasn't seen plus an optional direct instruction, post its reply.
 */
export async function runTeamTurn(
  agentId: "mara" | "kai",
  instruction?: string
): Promise<TeamMessage> {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`unknown agent ${agentId}`);

  const store = loadStore();
  const transcript = unseenTranscript(agentId, store);
  const lastId = store.messages.at(-1)?.id;

  const prompt = [
    `[Marketing team chat] You are ${agent.name} in the APOP marketing team channel with Gordon, Mara and Kai. Reply with only your message to the channel — no name prefix, keep it conversational and brief unless substance requires length.`,
    transcript ? `New messages since you last looked:\n\n${transcript}` : "",
    instruction ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const threadKey = `team:${agentId}`;
  const { reply, sessionId } = await sendToProfile(
    agent.hermesProfile,
    prompt,
    getThreadSession(threadKey)
  );
  setThreadSession(threadKey, sessionId);

  // Advance the cursor past everything the agent was shown, then append.
  const after = loadStore();
  if (lastId) after.cursors[agentId] = lastId;
  const { text, approval } = extractApproval(reply);
  const message: TeamMessage = {
    id: randomUUID().slice(0, 12),
    author: agentId,
    content: text,
    createdAt: new Date().toISOString(),
    approval,
  };
  after.messages.push(message);
  after.cursors[agentId] = message.id;
  saveStore(after);
  return message;
}

/** @Kai → kai, @Mara → mara, otherwise the manager answers. */
export function routeMention(message: string): "mara" | "kai" {
  if (/@kai\b/i.test(message)) return "kai";
  return "mara";
}

/**
 * Kanban watcher: posts handoffs and completions into the team channel.
 * Called every minute from instrumentation. First run seeds silently so
 * historical tasks aren't replayed.
 */
export async function kanbanWatchTick(
  readTasks: () => { id: string; title: string; status: string; assignee?: string; summary?: string }[]
): Promise<void> {
  const store = loadStore();
  const firstRun = Object.keys(store.kanbanSeen).length === 0;
  const tasks = readTasks();
  let changed = false;

  for (const task of tasks) {
    const prev = store.kanbanSeen[task.id];
    if (prev === task.status) continue;
    store.kanbanSeen[task.id] = task.status;
    changed = true;
    if (firstRun || prev === undefined) {
      if (!firstRun && task.assignee === "marketing-creative") {
        store.messages.push({
          id: randomUUID().slice(0, 12),
          author: "system",
          content: `Mara briefed Kai: “${task.title}” is on the board.`,
          createdAt: new Date().toISOString(),
        });
      }
      continue;
    }
    if (task.status === "running") {
      store.messages.push({
        id: randomUUID().slice(0, 12),
        author: "system",
        content: `Kai started working on “${task.title}”.`,
        createdAt: new Date().toISOString(),
      });
    } else if (task.status === "done") {
      store.messages.push({
        id: randomUUID().slice(0, 12),
        author: "kai",
        content: `Done: “${task.title}”.${task.summary ? ` ${task.summary}` : ""}`,
        createdAt: new Date().toISOString(),
      });
    }
  }
  if (changed) saveStore(store);
}
