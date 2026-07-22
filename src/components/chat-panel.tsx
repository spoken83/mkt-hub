"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { AgentAvatar } from "@/components/agent-avatar";
import { AgentMarkdown } from "@/components/agent-markdown";
import { ApprovalCard } from "@/components/approval-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AgentPersona, ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  agent: AgentPersona;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-SG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ChatPanel({ agent }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    fetch(`/api/chat/${agent.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: { messages: ChatMessage[] }) => {
        if (!cancelled) setMessages(data.messages);
      })
      .catch(() => {
        // No history yet (or backend down) — show the empty state.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");
      setBusy(true);

      const now = new Date().toISOString();
      const userMsg: ChatMessage = {
        id: `local-${crypto.randomUUID()}`,
        agentId: agent.id,
        role: "user",
        content: trimmed,
        createdAt: now,
      };
      const pendingMsg: ChatMessage = {
        id: `pending-${crypto.randomUUID()}`,
        agentId: agent.id,
        role: "agent",
        content: "",
        createdAt: now,
        pending: true,
      };
      setMessages((prev) => [...prev, userMsg, pendingMsg]);

      try {
        const res = await fetch(`/api/chat/${agent.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: { reply: ChatMessage } = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingMsg.id ? data.reply : m))
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? {
                  ...m,
                  pending: false,
                  role: "system" as const,
                  content: `Couldn't reach ${agent.name}: ${
                    err instanceof Error ? err.message : "unknown error"
                  }`,
                }
              : m
          )
        );
      } finally {
        setBusy(false);
      }
    },
    [agent.id, agent.name, busy]
  );

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3">
      <header className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <AgentAvatar agent={agent} size="lg" />
          <div>
            <h2 className="text-lg font-semibold">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">
              {agent.role} · {agent.tagline}
            </p>
          </div>
        </div>
        <div className="mt-3 border-t pt-2">
          <span className="inline-flex items-center gap-2 border-b-2 border-highlight pb-1 text-sm font-medium">
            <MessageCircle className="size-4" />
            Chat
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card shadow-sm">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading conversation…</p>
          ) : messages.length === 0 ? (
            <EmptyState agent={agent} onStarter={send} />
          ) : (
            messages.map((message) => (
              <MessageRow
                key={message.id}
                agent={agent}
                message={message}
                busy={busy}
                onDecide={(optionId) =>
                  void send(`I choose option ${optionId}.`)
                }
              />
            ))
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
              placeholder={`Message ${agent.name} — ask anything about your marketing`}
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

function EmptyState({
  agent,
  onStarter,
}: {
  agent: AgentPersona;
  onStarter: (text: string) => void;
}) {
  return (
    <div className="flex gap-3">
      <AgentAvatar agent={agent} size="sm" online={false} className="self-start" />
      <div className="max-w-2xl space-y-3">
        <div className="rounded-2xl rounded-tl-sm bg-muted p-4 text-sm leading-relaxed">
          <p className="font-medium">Hi, I&apos;m {agent.name} 👋</p>
          <p className="mt-2 whitespace-pre-wrap">{agent.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {agent.starters.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => onStarter(starter)}
              className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {starter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageRow({
  agent,
  message,
  busy,
  onDecide,
}: {
  agent: AgentPersona;
  message: ChatMessage;
  busy: boolean;
  onDecide: (optionId: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-xl rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.role === "system") {
    return (
      <p className="text-center text-xs text-muted-foreground">{message.content}</p>
    );
  }

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
        {message.pending ? (
          <div className="flex gap-1 py-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "size-2 animate-bounce rounded-full bg-muted-foreground/50",
                  i === 1 && "[animation-delay:120ms]",
                  i === 2 && "[animation-delay:240ms]"
                )}
              />
            ))}
          </div>
        ) : (
          <>
            {message.content && (
              <div className="max-w-2xl rounded-2xl rounded-tl-sm bg-muted p-4">
                <AgentMarkdown content={message.content} />
              </div>
            )}
            {message.approval && (
              <ApprovalCard
                approval={message.approval}
                onDecide={onDecide}
                disabled={busy}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
