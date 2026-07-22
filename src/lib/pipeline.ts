import { loadCalendar } from "./calendar";
import { readBoard } from "./hermes/kanban";
import {
  PIPELINE_COLUMNS,
  type PipelineColumn,
  type PipelineColumnId,
  type PipelineItem,
} from "./pipeline-shared";

// Gordon's view of the workflow. Hermes kanban statuses cover production;
// the calendar covers approval → publication. A "done" task whose output is
// on the calendar is represented by the post card, not the task card.
const TASK_STATUS_TO_COLUMN: Record<string, PipelineColumnId | null> = {
  triage: "triage",
  todo: "todo",
  ready: "todo",
  scheduled: "todo",
  running: "inprogress",
  review: "inprogress",
  blocked: "blocked",
  done: "approval",
};

const ENTRY_STATUS_TO_COLUMN: Record<string, PipelineColumnId> = {
  planned: "approval",
  scheduled: "scheduled",
  posted: "live",
};

export function readPipeline(): PipelineColumn[] {
  const board = readBoard();
  const entries = loadCalendar();
  const linkedTaskIds = new Set(
    entries.map((e) => e.kanbanTaskId).filter(Boolean)
  );

  const columns: PipelineColumn[] = PIPELINE_COLUMNS.map((c) => ({
    ...c,
    items: [],
  }));
  const push = (col: PipelineColumnId | null, item: PipelineItem) => {
    if (col) columns.find((c) => c.id === col)?.items.push(item);
  };

  for (const entry of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
    push(ENTRY_STATUS_TO_COLUMN[entry.status] ?? "approval", {
      id: `post-${entry.id}`,
      kind: "post",
      title: entry.title,
      description: entry.notes,
      labels: [entry.vertical, entry.contentType].filter(
        (x): x is string => !!x
      ),
      date: entry.date,
      entry,
    });
  }

  for (const task of Object.values(board.tasks)) {
    const column = TASK_STATUS_TO_COLUMN[task.column] ?? null;
    // Finished work already represented by a calendar post → skip the task card.
    if (task.column === "done" && linkedTaskIds.has(task.id)) continue;
    push(column, {
      id: `task-${task.id}`,
      kind: "task",
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      labels: task.labels,
    });
  }

  return columns;
}
