"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { KanbanBoard as Board } from "@/lib/types";

export function KanbanBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/kanban");
      if (!res.ok) throw new Error(`Board unavailable (${res.status})`);
      setBoard(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(load, 30_000);
    queueMicrotask(load);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3">
      <header className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Content pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Kanban board “{board?.name ?? "marketing"}” — refreshes every 30s
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
        >
          <RefreshCw className="mr-1.5 size-3.5" />
          Refresh
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-x-auto rounded-2xl border bg-card p-4 shadow-sm">
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : loading && !board ? (
          <div className="flex gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-64 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : board ? (
          <div className="flex h-full gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex w-64 shrink-0 flex-col rounded-xl bg-muted/60"
              >
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm font-semibold">{column.name}</span>
                  <Badge variant="secondary">{column.taskIds.length}</Badge>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                  {column.taskIds.map((taskId) => {
                    const task = board.tasks[taskId];
                    if (!task) return null;
                    const assignee = AGENTS.find(
                      (a) => a.hermesProfile === task.assignee
                    );
                    return (
                      <div
                        key={task.id}
                        className="rounded-lg border bg-card p-3 shadow-sm"
                      >
                        <p className="text-sm font-medium leading-snug">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {assignee && (
                            <Badge
                              variant="outline"
                              style={{ color: assignee.accent }}
                            >
                              {assignee.name}
                            </Badge>
                          )}
                          {task.labels.map((label) => (
                            <Badge key={label} variant="secondary">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {column.taskIds.length === 0 && (
                    <p className="px-1 pb-2 text-xs text-muted-foreground">
                      Empty
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
