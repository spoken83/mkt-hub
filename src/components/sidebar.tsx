"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  FolderOpen,
  KanbanSquare,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "@/components/agent-avatar";
import { Input } from "@/components/ui/input";

export type ActiveView =
  | { kind: "agent"; agentId: string }
  | { kind: "team" }
  | { kind: "board" }
  | { kind: "calendar" }
  | { kind: "assets" }
  | { kind: "settings" };

interface SidebarProps {
  active: ActiveView;
  onSelect: (view: ActiveView) => void;
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    queueMicrotask(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // private mode — theme just won't persist
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  const [query, setQuery] = useState("");
  const agents = AGENTS.filter((a) =>
    `${a.name} ${a.role} ${a.tagline}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col rounded-2xl border bg-card shadow-sm">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Marketing Hub</h1>
            <p className="text-xs text-muted-foreground">APOP Digital</p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-9 rounded-full pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Channels
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelect({ kind: "team" })}
          className={cn(
            "mb-4 flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors",
            active.kind === "team"
              ? "border-border bg-accent shadow-sm"
              : "hover:bg-accent/60"
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-4" />
          </span>
          <div>
            <div className="text-sm font-medium">Marketing team</div>
            <div className="text-xs text-muted-foreground">
              You, Mara &amp; Kai
            </div>
          </div>
        </button>

        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agents
          </span>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            title="Adding agents comes with the SaaS build"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="space-y-1">
          {agents.map((agent) => {
            const isActive =
              active.kind === "agent" && active.agentId === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelect({ kind: "agent", agentId: agent.id })}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors",
                  isActive
                    ? "border-border bg-accent shadow-sm"
                    : "hover:bg-accent/60"
                )}
              >
                <AgentAvatar agent={agent} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{agent.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {agent.role} · {agent.tagline}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mb-2 mt-6 px-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelect({ kind: "board" })}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors",
            active.kind === "board"
              ? "border-border bg-accent shadow-sm"
              : "hover:bg-accent/60"
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KanbanSquare className="size-4" />
          </span>
          <div>
            <div className="text-sm font-medium">Content Pipeline</div>
            <div className="text-xs text-muted-foreground">
              What the team is working on
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSelect({ kind: "calendar" })}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors",
            active.kind === "calendar"
              ? "border-border bg-accent shadow-sm"
              : "hover:bg-accent/60"
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="size-4" />
          </span>
          <div>
            <div className="text-sm font-medium">Calendar</div>
            <div className="text-xs text-muted-foreground">
              Planned · scheduled · posted
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSelect({ kind: "assets" })}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors",
            active.kind === "assets"
              ? "border-border bg-accent shadow-sm"
              : "hover:bg-accent/60"
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FolderOpen className="size-4" />
          </span>
          <div>
            <div className="text-sm font-medium">Assets</div>
            <div className="text-xs text-muted-foreground">
              Marketing Drive folder
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSelect({ kind: "settings" })}
          className={cn(
            "mt-1 flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-colors",
            active.kind === "settings"
              ? "border-border bg-accent shadow-sm"
              : "hover:bg-accent/60"
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Settings className="size-4" />
          </span>
          <div>
            <div className="text-sm font-medium">Settings</div>
            <div className="text-xs text-muted-foreground">
              Briefing, verticals, context
            </div>
          </div>
        </button>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
            G
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">Gordon Frois</div>
            <div className="truncate text-xs text-muted-foreground">
              gordon.matthew@gmail.com
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
