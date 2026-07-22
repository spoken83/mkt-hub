"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
} from "lucide-react";
import { AGENTS } from "@/lib/agents";
import type { CalendarEntry } from "@/lib/calendar-shared";
import { STATUS_LABELS } from "@/lib/calendar-shared";
import type { TeamMessage } from "@/lib/team-shared";
import { AgentAvatar } from "@/components/agent-avatar";
import { AgentMarkdown } from "@/components/agent-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PostDialogProps {
  entry: CalendarEntry | null;
  onClose: () => void;
  onChanged: () => void;
}

export function PostDialog({ entry, onClose, onChanged }: PostDialogProps) {
  const [thread, setThread] = useState<TeamMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [slide, setSlide] = useState(0);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!entry) return;
    try {
      const res = await fetch(`/api/calendar/${entry.id}/thread`);
      if (res.ok) setThread((await res.json()).messages);
    } catch {
      // next poll catches up
    }
  }, [entry]);

  // State resets between posts via the key={entry.id} on the parent side.
  useEffect(() => {
    if (entry) queueMicrotask(load);
  }, [entry, load]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [thread, busy]);

  if (!entry) return null;
  const images = entry.driveLinks ?? [];

  const goTo = (index: number) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setBusy(true);
    setThread((prev) => [
      ...prev,
      {
        id: `local-${crypto.randomUUID()}`,
        author: "gordon",
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      await fetch(`/api/calendar/${entry.id}/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
    } finally {
      setBusy(false);
      await load();
      onChanged();
    }
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      await fetch(`/api/calendar/${entry.id}/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      await load();
      onChanged();
    } finally {
      setConfirming(false);
    }
  };

  const remove = async () => {
    await fetch(`/api/calendar/${entry.id}`, { method: "DELETE" });
    onChanged();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[92vh] w-[95vw] flex-col overflow-hidden sm:max-w-[1280px]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6 text-base">
            <span className="truncate">{entry.title}</span>
            <Badge variant="secondary">{entry.date}</Badge>
            <Badge
              className={cn(
                entry.status === "posted" && "bg-emerald-600",
                entry.status === "scheduled" && "bg-amber-500 text-black",
                entry.status === "planned" && "bg-sky-600"
              )}
            >
              {STATUS_LABELS[entry.status]}
            </Badge>
            {entry.vertical && <Badge variant="outline">{entry.vertical}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto md:grid-cols-[minmax(0,360px)_1fr] md:overflow-hidden">
          {/* Phone-style preview */}
          <div className="mx-auto w-full max-w-[360px] md:overflow-y-auto">
            <div className="overflow-hidden rounded-[2rem] border-4 border-foreground/80 bg-background shadow-lg">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-fuchsia-500 text-[10px] font-bold text-white">
                  A
                </span>
                <span className="text-xs font-semibold">apop_digital</span>
              </div>
              {images.length > 0 ? (
                <div className="group relative">
                  <div
                    ref={stripRef}
                    onScroll={() => {
                      const el = stripRef.current;
                      if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
                    }}
                    className="flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto scroll-smooth bg-muted/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {images.map((fileId) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={fileId}
                        src={`/api/drive/${fileId}`}
                        alt=""
                        className="aspect-[4/5] w-full shrink-0 snap-center object-contain"
                      />
                    ))}
                  </div>
                  {images.length > 1 && slide > 0 && (
                    <button
                      type="button"
                      onClick={() => goTo(slide - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-opacity hover:bg-black/70"
                      title="Previous slide"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                  )}
                  {images.length > 1 && slide < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => goTo(slide + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-opacity hover:bg-black/70"
                      title="Next slide"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  )}
                  {images.length > 1 && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                      {slide + 1}/{images.length}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center bg-muted text-sm text-muted-foreground">
                  No artifacts linked yet
                </div>
              )}
              {images.length > 1 && (
                <div className="flex justify-center gap-1.5 py-2">
                  {images.map((fileId, i) => (
                    <button
                      key={fileId}
                      type="button"
                      onClick={() => goTo(i)}
                      title={`Slide ${i + 1}`}
                      className={cn(
                        "size-2 rounded-full transition-colors",
                        i === slide ? "bg-sky-500" : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              )}
              <div className="px-3 pb-3 pt-1 text-xs leading-relaxed">
                <span className="font-semibold">apop_digital</span>{" "}
                <span
                  className={cn(
                    "whitespace-pre-wrap text-muted-foreground",
                    !captionOpen && "line-clamp-4"
                  )}
                >
                  {entry.caption ?? entry.notes ?? "No caption yet."}
                </span>
                {(entry.caption ?? "").length > 160 && (
                  <button
                    type="button"
                    onClick={() => setCaptionOpen((v) => !v)}
                    className="mt-0.5 block font-medium text-muted-foreground/70 hover:text-foreground"
                  >
                    {captionOpen ? "less" : "more"}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              {entry.status === "posted" ? (
                <span className="text-xs text-muted-foreground">
                  Live — can&apos;t be deleted
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={remove}
                  className="text-destructive"
                >
                  <Trash2 className="mr-1 size-3.5" />
                  Delete
                </Button>
              )}
              {entry.status === "planned" && (
                <Button size="sm" onClick={confirm} disabled={confirming}>
                  <CheckCheck className="mr-1.5 size-4" />
                  {confirming ? "Confirming…" : "Confirm & schedule"}
                </Button>
              )}
            </div>
          </div>

          {/* Post copy + discussion */}
          <div className="flex min-h-0 flex-col gap-4">
            <div className="shrink-0 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-medium">Post copy</span>
                {entry.caption && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      void navigator.clipboard.writeText(entry.caption ?? "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    <Copy className="mr-1 size-3" />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </div>
              {entry.caption ? (
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed">
                  {entry.caption}
                </p>
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  No copy on file yet — ask Kai below to write or recover it.
                </p>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-muted/20">
            <div className="border-b px-4 py-2.5 text-sm font-medium">
              Discussion
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Kai answers · @Mara for planning
              </span>
            </div>
            <div
              ref={threadRef}
              className="min-h-48 flex-1 space-y-4 overflow-y-auto p-4"
            >
              {thread.length === 0 && !busy && (
                <p className="text-sm text-muted-foreground">
                  Discuss this post — ask for tweaks, deep-dive the angle, or
                  request a rework. Kai will iterate until it&apos;s to your
                  liking, then hit Confirm.
                </p>
              )}
              {thread.map((m) => (
                <ThreadRow key={m.id} message={m} />
              ))}
              {busy && (
                <p className="text-xs text-muted-foreground">
                  Working on it — creative changes can take a few minutes…
                </p>
              )}
            </div>
            <form
              className="border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <div className="flex items-end gap-2 rounded-xl border bg-background p-1.5">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder="e.g. Make the hook on slide 1 punchier"
                  rows={1}
                  className="max-h-28 min-h-9 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="size-8 rounded-full"
                  disabled={busy || !input.trim()}
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThreadRow({ message }: { message: TeamMessage }) {
  if (message.author === "system") {
    return (
      <p className="text-center text-xs text-muted-foreground">{message.content}</p>
    );
  }
  if (message.author === "gordon") {
    return (
      <div className="flex justify-end">
        <div className="max-w-md rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }
  const agent = AGENTS.find((a) => a.id === message.author);
  if (!agent) return null;
  return (
    <div className="flex gap-2.5">
      <AgentAvatar agent={agent} size="sm" online={false} className="self-start" />
      <div className="min-w-0">
        <span className="text-xs font-semibold">{agent.name}</span>
        <div className="mt-1 max-w-md rounded-2xl rounded-tl-sm bg-muted p-3">
          <AgentMarkdown content={message.content} />
        </div>
      </div>
    </div>
  );
}
