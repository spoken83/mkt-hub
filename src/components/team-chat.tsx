"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Users } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import type { TeamMessage } from "@/lib/team-shared";
import { AgentAvatar } from "@/components/agent-avatar";
import { AgentMarkdown } from "@/components/agent-markdown";
import { ApprovalCard } from "@/components/approval-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-SG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function TeamChat() {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) setMessages((await res.json()).messages);
    } catch {
      // transient — next poll will catch up
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
    const timer = setInterval(load, 8_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");
      setBusy(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${crypto.randomUUID()}`,
          author: "gordon",
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);
      try {
        await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
      } finally {
        setBusy(false);
        await load();
      }
    },
    [busy, load]
  );

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3">
      <header className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Marketing team</h2>
            <p className="text-sm text-muted-foreground">
              You, Mara and Kai — briefings, decisions and handoffs
            </p>
          </div>
          <div className="flex -space-x-2">
            {AGENTS.map((a) => (
              <AgentAvatar key={a.id} agent={a} size="sm" />
            ))}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card shadow-sm">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No team messages yet. Say hello, or wait for Mara&apos;s next
              briefing to open the conversation. Use @Kai to address Kai
              directly — otherwise Mara answers.
            </p>
          )}
          {messages.map((message) => (
            <TeamRow key={message.id} message={message} busy={busy} onSend={send} />
          ))}
          {busy && (
            <p className="text-xs text-muted-foreground">
              Waiting for a reply — agent turns can take a few minutes…
            </p>
          )}
        </div>
        <form
          className="border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border bg-background p-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Message the team — @Kai to address Kai, otherwise Mara answers"
              rows={1}
              className="max-h-40 min-h-10 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full"
              disabled={busy || !input.trim()}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamRow({
  message,
  busy,
  onSend,
}: {
  message: TeamMessage;
  busy: boolean;
  onSend: (text: string) => void;
}) {
  if (message.author === "system") {
    return (
      <p className="text-center text-xs text-muted-foreground">
        {message.content} · {formatTime(message.createdAt)}
      </p>
    );
  }

  if (message.author === "gordon") {
    return (
      <div className="flex justify-end">
        <div className="max-w-xl rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const agent = AGENTS.find((a) => a.id === message.author);
  if (!agent) return null;
  return (
    <div className="flex gap-3">
      <AgentAvatar agent={agent} size="sm" online={false} className="self-start" />
      <div className="min-w-0 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{agent.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>
        {message.content && (
          <div className="max-w-2xl rounded-2xl rounded-tl-sm bg-muted p-4">
            <AgentMarkdown content={message.content} />
          </div>
        )}
        {message.approval && (
          <ApprovalCard
            approval={message.approval}
            disabled={busy}
            onDecide={(optionId) => onSend(`I choose option ${optionId}.`)}
          />
        )}
      </div>
    </div>
  );
}
