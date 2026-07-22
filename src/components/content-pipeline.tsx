"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, RefreshCw } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import type { PipelineColumn, PipelineItem } from "@/lib/pipeline-shared";
import type { CalendarEntry } from "@/lib/calendar-shared";
import { PostDialog } from "@/components/post-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const COLUMN_ACCENTS: Record<string, string> = {
  approval: "border-t-sky-400",
  scheduled: "border-t-amber-400",
  live: "border-t-emerald-400",
  blocked: "border-t-red-400",
};

export function ContentPipeline() {
  const [columns, setColumns] = useState<PipelineColumn[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openEntry, setOpenEntry] = useState<CalendarEntry | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      if (!res.ok) throw new Error(`Pipeline unavailable (${res.status})`);
      setColumns((await res.json()).columns);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(load, 30_000);
    queueMicrotask(load);
    return () => clearInterval(timer);
  }, [load]);

  const putOnCalendar = async (item: PipelineItem) => {
    const today = new Date().toISOString().slice(0, 10);
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        date: today,
        status: "planned",
        kanbanTaskId: item.id.replace(/^task-/, ""),
        notes: "Added from Content Pipeline — set the real date and ask Kai to link artifacts.",
      }),
    });
    await load();
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3">
      <header className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Content Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            From idea to live post — production, approval and publishing in one
            flow
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

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border bg-card p-4 shadow-sm">
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : loading && !columns ? (
          <div className="flex gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-64 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : columns ? (
          <div className="flex min-h-full w-max gap-4">
            {columns.map((column) => (
              <div
                key={column.id}
                className={cn(
                  "flex max-h-[calc(100dvh-14rem)] w-64 shrink-0 flex-col self-start rounded-xl border-t-4 border-t-transparent bg-muted/60",
                  COLUMN_ACCENTS[column.id]
                )}
              >
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm font-semibold">{column.name}</span>
                  <Badge variant="secondary">{column.items.length}</Badge>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                  {column.items.map((item) => (
                    <PipelineCard
                      key={item.id}
                      item={item}
                      columnId={column.id}
                      onOpen={() => item.entry && setOpenEntry(item.entry)}
                      onPutOnCalendar={() => void putOnCalendar(item)}
                    />
                  ))}
                  {column.items.length === 0 && (
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

      {openEntry && (
        <PostDialog
          key={openEntry.id}
          entry={openEntry}
          onClose={() => setOpenEntry(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}

function PipelineCard({
  item,
  columnId,
  onOpen,
  onPutOnCalendar,
}: {
  item: PipelineItem;
  columnId: string;
  onOpen: () => void;
  onPutOnCalendar: () => void;
}) {
  const assignee = AGENTS.find((a) => a.hermesProfile === item.assignee);
  const thumb = item.entry?.driveLinks?.[0];
  const clickable = item.kind === "post";

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onOpen : undefined}
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-sm",
        clickable && "cursor-pointer transition-colors hover:border-primary/40"
      )}
    >
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/drive/${thumb}`}
          alt=""
          loading="lazy"
          className="h-24 w-full border-b object-cover"
        />
      )}
      <div className="p-3">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.date && <Badge variant="secondary">{item.date}</Badge>}
          {assignee && (
            <Badge variant="outline" style={{ color: assignee.accent }}>
              {assignee.name}
            </Badge>
          )}
          {item.labels.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
        {item.kind === "task" && columnId === "approval" && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-7 w-full text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onPutOnCalendar();
            }}
          >
            <CalendarPlus className="mr-1 size-3" />
            Put on calendar to review
          </Button>
        )}
      </div>
    </div>
  );
}
