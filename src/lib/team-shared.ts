// Client-safe team chat types (no node imports).
import type { ApprovalRequest } from "./types";

export type TeamAuthor = "gordon" | "mara" | "kai" | "system";

export interface TeamMessage {
  id: string;
  author: TeamAuthor;
  content: string;
  createdAt: string;
  approval?: ApprovalRequest;
}
