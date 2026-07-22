import { extractApproval } from "../approval";
import type { ChatMessage } from "../types";
import { hermesConfig } from "./config";
import { withDb } from "./db";

interface MessageRow {
  id: number;
  role: string;
  content: string | null;
  timestamp: number;
}

/** Reads a session's user/assistant turns from a profile's state.db. */
export function getSessionMessages(
  profile: string,
  sessionId: string,
  agentId: string
): ChatMessage[] {
  const rows = withDb(hermesConfig.profileStateDb(profile), (db) =>
    db
      .prepare(
        `SELECT id, role, content, timestamp FROM messages
         WHERE session_id = ? AND role IN ('user', 'assistant')
           AND content IS NOT NULL AND content != ''
         ORDER BY timestamp, id`
      )
      .all(sessionId)
  ) as MessageRow[];

  return rows.map((row) => {
    if (row.role === "user") {
      return {
        id: String(row.id),
        agentId,
        role: "user" as const,
        content: row.content ?? "",
        createdAt: new Date(row.timestamp * 1000).toISOString(),
      };
    }
    const { text, approval } = extractApproval(row.content ?? "");
    return {
      id: String(row.id),
      agentId,
      role: "agent" as const,
      content: text,
      createdAt: new Date(row.timestamp * 1000).toISOString(),
      approval,
    };
  });
}

/**
 * Last assistant turn of a session recorded after `sinceEpochSeconds` —
 * used to pick up the CLI's reply. The time filter guards against
 * returning a stale earlier reply when the invocation died before
 * recording anything.
 */
export function getLastAssistantMessage(
  profile: string,
  sessionId: string,
  sinceEpochSeconds: number
): string | null {
  const row = withDb(hermesConfig.profileStateDb(profile), (db) =>
    db
      .prepare(
        `SELECT content FROM messages
         WHERE session_id = ? AND role = 'assistant'
           AND content IS NOT NULL AND content != ''
           AND timestamp >= ?
         ORDER BY timestamp DESC, id DESC LIMIT 1`
      )
      .get(sessionId, sinceEpochSeconds)
  ) as { content: string } | undefined;
  return row?.content ?? null;
}
