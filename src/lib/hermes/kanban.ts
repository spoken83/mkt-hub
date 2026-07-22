import fs from "node:fs";
import { hermesConfig } from "./config";
import { withDb } from "./db";
import type { KanbanBoard, KanbanTask } from "../types";

// Hermes models columns as the tasks.status enum. Archived is hidden.
const COLUMNS: { id: string; name: string }[] = [
  { id: "triage", name: "Triage" },
  { id: "todo", name: "Todo" },
  { id: "scheduled", name: "Scheduled" },
  { id: "ready", name: "Ready" },
  { id: "running", name: "In Progress" },
  { id: "blocked", name: "Blocked" },
  { id: "review", name: "Review" },
  { id: "done", name: "Done" },
];

interface TaskRow {
  id: string;
  title: string;
  body: string | null;
  assignee: string | null;
  status: string;
  skills: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

/** Flat task list with latest run summary — used by the team-chat watcher. */
export function readTaskSummaries(): {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  summary?: string;
}[] {
  if (!fs.existsSync(hermesConfig.kanbanDb)) return [];
  const rows = withDb(hermesConfig.kanbanDb, (db) =>
    db
      .prepare(
        `SELECT t.id, t.title, t.status, t.assignee,
                (SELECT r.summary FROM task_runs r WHERE r.task_id = t.id
                 ORDER BY r.started_at DESC LIMIT 1) AS summary
         FROM tasks t`
      )
      .all()
  ) as { id: string; title: string; status: string; assignee: string | null; summary: string | null }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    assignee: r.assignee ?? undefined,
    summary: r.summary ?? undefined,
  }));
}

export function readBoard(): KanbanBoard {
  if (!fs.existsSync(hermesConfig.kanbanDb)) {
    return {
      name: hermesConfig.kanbanBoard,
      columns: COLUMNS.map((c) => ({ ...c, taskIds: [] })),
      tasks: {},
    };
  }

  const rows = withDb(hermesConfig.kanbanDb, (db) =>
    db
      .prepare(
        `SELECT id, title, body, assignee, status, skills,
                created_at, started_at, completed_at
         FROM tasks WHERE status != 'archived'
         ORDER BY created_at DESC`
      )
      .all()
  ) as TaskRow[];

  const tasks: Record<string, KanbanTask> = {};
  const columns = COLUMNS.map((c) => ({ ...c, taskIds: [] as string[] }));

  for (const row of rows) {
    let labels: string[] = [];
    try {
      const parsed = JSON.parse(row.skills ?? "[]");
      if (Array.isArray(parsed)) labels = parsed.map(String);
    } catch {
      // skills column is best-effort metadata
    }
    tasks[row.id] = {
      id: row.id,
      title: row.title,
      description: row.body ?? undefined,
      column: row.status,
      assignee: row.assignee ?? undefined,
      labels,
      createdAt: row.created_at ?? undefined,
      updatedAt: row.completed_at ?? row.started_at ?? undefined,
    };
    columns.find((c) => c.id === row.status)?.taskIds.push(row.id);
  }

  return { name: hermesConfig.kanbanBoard, columns, tasks };
}
