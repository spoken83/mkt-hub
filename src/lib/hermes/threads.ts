import fs from "node:fs";
import path from "node:path";

// Maps each UI agent to its active Hermes session (one ongoing thread per
// agent in v1). Stored outside git in .data/.
const THREADS_FILE = path.join(process.cwd(), ".data", "threads.json");

type ThreadMap = Record<string, { sessionId: string; updatedAt: string }>;

function load(): ThreadMap {
  try {
    return JSON.parse(fs.readFileSync(THREADS_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function getThreadSession(agentId: string): string | undefined {
  return load()[agentId]?.sessionId;
}

export function setThreadSession(agentId: string, sessionId: string): void {
  const map = load();
  map[agentId] = { sessionId, updatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(THREADS_FILE), { recursive: true });
  fs.writeFileSync(THREADS_FILE, JSON.stringify(map, null, 2));
}
