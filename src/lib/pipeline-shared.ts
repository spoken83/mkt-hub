// Client-safe types for the content pipeline (kanban ∪ calendar merge).
import type { CalendarEntry } from "./calendar-shared";

export type PipelineColumnId =
  | "triage"
  | "todo"
  | "inprogress"
  | "approval"
  | "scheduled"
  | "live"
  | "blocked";

export interface PipelineItem {
  id: string;
  /** task = Hermes kanban work item; post = calendar entry */
  kind: "task" | "post";
  title: string;
  description?: string;
  assignee?: string;
  labels: string[];
  date?: string;
  /** present on post cards — enables the post dialog */
  entry?: CalendarEntry;
}

export interface PipelineColumn {
  id: PipelineColumnId;
  name: string;
  items: PipelineItem[];
}

export const PIPELINE_COLUMNS: { id: PipelineColumnId; name: string }[] = [
  { id: "triage", name: "Triage" },
  { id: "todo", name: "To-do" },
  { id: "inprogress", name: "In Progress" },
  { id: "approval", name: "For Approval" },
  { id: "scheduled", name: "Approved / Scheduled" },
  { id: "live", name: "Live" },
  { id: "blocked", name: "Blocked" },
];
