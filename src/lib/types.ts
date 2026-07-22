// UI-facing domain types. Hermes-specific shapes are mapped into these
// inside src/lib/hermes/ so the frontend never depends on Hermes internals.

export interface AgentPersona {
  /** Stable id used in routes and thread storage */
  id: string;
  /** Hermes profile name this persona drives */
  hermesProfile: string;
  name: string;
  role: string;
  /** One-line specialty shown under the name */
  tagline: string;
  /** Longer intro shown on an empty thread */
  intro: string;
  /** Example prompts shown on an empty thread */
  starters: string[];
  avatar: string; // path under /public
  accent: string; // tailwind-compatible hex for fallbacks/accents
}

export type MessageRole = "user" | "agent" | "system";

export interface ChatMessage {
  id: string;
  agentId: string;
  role: MessageRole;
  content: string;
  createdAt: string; // ISO
  /** Set while the agent is still producing this message */
  pending?: boolean;
  /** Structured approval payload rendered as a card instead of plain text */
  approval?: ApprovalRequest;
}

export interface ChatThread {
  id: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Hermes session identifier backing this thread, once known */
  hermesSessionId?: string;
}

/** An approval gate surfaced by an agent (storyboard pick, publish sign-off) */
export interface ApprovalRequest {
  kind: "storyboard" | "publish";
  title: string;
  options: ApprovalOption[];
  /** Chosen option id once the user has decided */
  decision?: string;
}

export interface ApprovalOption {
  id: string; // "A" | "B" | "C" | "publish" | "hold" ...
  label: string;
  summary: string;
  details?: string[];
  /** Preview images (artifact paths served via /api/artifacts) */
  images?: string[];
}

export interface KanbanColumn {
  id: string;
  name: string;
  taskIds: string[];
}

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  column: string;
  assignee?: string; // hermes profile name
  labels: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface KanbanBoard {
  name: string;
  columns: KanbanColumn[];
  tasks: Record<string, KanbanTask>;
}
