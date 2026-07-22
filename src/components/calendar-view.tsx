"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { CalendarEntry, CalendarStatus } from "@/lib/calendar-shared";
import { STATUS_LABELS } from "@/lib/calendar-shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<CalendarStatus, string> = {
  planned: "bg-amber-100 text-amber-900 border-amber-300",
  scheduled: "bg-orange-100 text-orange-900 border-orange-300",
  posted: "bg-emerald-100 text-emerald-900 border-emerald-300",
};

interface Draft {
  id?: string;
  date: string;
  title: string;
  status: CalendarStatus;
  vertical: string;
  notes: string;
  driveLinks?: string[];
}

export function CalendarView() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar");
      if (res.ok) setEntries((await res.json()).entries);
    } catch {
      // Keep whatever we have.
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const saveDraft = async () => {
    if (!draft || !draft.title.trim()) return;
    setBusy(true);
    try {
      const payload = {
        title: draft.title,
        date: draft.date,
        status: draft.status,
        vertical: draft.vertical || undefined,
        notes: draft.notes || undefined,
      };
      const res = draft.id
        ? await fetch(`/api/calendar/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        setDraft(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) return;
    setBusy(true);
    try {
      await fetch(`/api/calendar/${draft.id}`, { method: "DELETE" });
      setDraft(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const monthStr = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const firstDay = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7; // Monday-first grid
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells: { date?: string; day?: number }[] = [
    ...Array.from({ length: leadingBlanks }, () => ({})),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      date: `${monthStr}-${String(i + 1).padStart(2, "0")}`,
    })),
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3">
      <header className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Content calendar</h2>
          <p className="text-sm text-muted-foreground">
            Planned, scheduled and posted content — mirrored to your Obsidian
            vault.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCursor((c) =>
                c.month === 0
                  ? { year: c.year - 1, month: 11 }
                  : { year: c.year, month: c.month - 1 }
              )
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-36 text-center text-sm font-medium">
            {firstDay.toLocaleString("en-SG", { month: "long", year: "numeric" })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCursor((c) =>
                c.month === 11
                  ? { year: c.year + 1, month: 0 }
                  : { year: c.year, month: c.month + 1 }
              )
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell, i) =>
            cell.date ? (
              <button
                key={cell.date}
                type="button"
                onClick={() =>
                  setDraft({
                    date: cell.date!,
                    title: "",
                    status: "planned",
                    vertical: "",
                    notes: "",
                  })
                }
                className={cn(
                  "flex min-h-24 flex-col items-stretch gap-1 rounded-lg border p-1.5 text-left transition-colors hover:border-primary/40",
                  cell.date === todayStr && "border-primary ring-1 ring-primary"
                )}
              >
                <span className="text-xs text-muted-foreground">{cell.day}</span>
                {entries
                  .filter((e) => e.date === cell.date)
                  .map((entry) => (
                    <span
                      key={entry.id}
                      role="button"
                      tabIndex={0}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setDraft({
                          id: entry.id,
                          date: entry.date,
                          title: entry.title,
                          status: entry.status,
                          vertical: entry.vertical ?? "",
                          notes: entry.notes ?? "",
                          driveLinks: entry.driveLinks,
                        });
                      }}
                      className={cn(
                        "truncate rounded border px-1.5 py-0.5 text-xs",
                        STATUS_STYLES[entry.status]
                      )}
                      title={entry.title}
                    >
                      {entry.title}
                    </span>
                  ))}
              </button>
            ) : (
              <div key={`blank-${i}`} />
            )
          )}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
          {(Object.keys(STATUS_LABELS) as CalendarStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("size-3 rounded border", STATUS_STYLES[s])} />
              {STATUS_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit entry" : "New entry"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              {draft.driveLinks && draft.driveLinks.length > 0 && (
                <div className="flex gap-2 overflow-x-auto rounded-lg border bg-muted/30 p-2">
                  {draft.driveLinks.map((fileId) => (
                    <a
                      key={fileId}
                      href={`/api/drive/${fileId}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open full size"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/drive/${fileId}`}
                        alt=""
                        loading="lazy"
                        className="h-28 rounded-md border object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Education carousel: AI oral practice"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label>Status</Label>
                  <div className="flex gap-1">
                    {(Object.keys(STATUS_LABELS) as CalendarStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDraft({ ...draft, status: s })}
                        className={cn(
                          "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                          draft.status === s
                            ? STATUS_STYLES[s]
                            : "text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Vertical</Label>
                <Input
                  value={draft.vertical}
                  onChange={(e) => setDraft({ ...draft, vertical: e.target.value })}
                  placeholder="education, construction…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                {draft.id ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={remove}
                    disabled={busy}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Delete
                  </Button>
                ) : (
                  <span />
                )}
                <Button onClick={saveDraft} disabled={busy || !draft.title.trim()}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
