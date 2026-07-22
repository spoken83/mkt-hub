// Client-safe calendar types (no node imports).

export type CalendarStatus = "planned" | "scheduled" | "posted";

export interface CalendarEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  vertical?: string;
  contentType?: "carousel" | "static" | "video" | "copy" | "other";
  status: CalendarStatus;
  notes?: string;
  kanbanTaskId?: string;
  driveLinks?: string[];
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<CalendarStatus, string> = {
  planned: "Planned",
  scheduled: "Scheduled",
  posted: "Posted",
};
