import type { ApprovalRequest } from "./types";

// Agents surface approval gates by emitting a fenced ```json block whose
// object has kind: "storyboard" | "publish" and an options array (this
// convention lives in the mm-storyboarding / mm-daily-routine skills).
// Everything else in the message stays plain text.
const JSON_BLOCK = /```json\s*([\s\S]*?)```/g;

export function extractApproval(content: string): {
  text: string;
  approval?: ApprovalRequest;
} {
  for (const match of content.matchAll(JSON_BLOCK)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (isApprovalRequest(parsed)) {
        return {
          text: content.replace(match[0], "").trim(),
          approval: parsed,
        };
      }
    } catch {
      // Not valid JSON — leave the block as visible text.
    }
  }
  return { text: content };
}

function isApprovalRequest(value: unknown): value is ApprovalRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.kind === "storyboard" || v.kind === "publish") &&
    typeof v.title === "string" &&
    Array.isArray(v.options) &&
    v.options.every(
      (o) =>
        typeof o === "object" &&
        o !== null &&
        typeof (o as Record<string, unknown>).id === "string" &&
        typeof (o as Record<string, unknown>).label === "string"
    )
  );
}
