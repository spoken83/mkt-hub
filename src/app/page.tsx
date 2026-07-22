"use client";

import { useState } from "react";
import { AGENTS, getAgent } from "@/lib/agents";
import { ChatPanel } from "@/components/chat-panel";
import { KanbanBoard } from "@/components/kanban-board";
import { SettingsPanel } from "@/components/settings-panel";
import { Sidebar, type ActiveView } from "@/components/sidebar";

export default function Home() {
  const [active, setActive] = useState<ActiveView>({
    kind: "agent",
    agentId: AGENTS[0].id,
  });

  const agent = active.kind === "agent" ? getAgent(active.agentId) : undefined;

  return (
    <div className="flex h-dvh gap-3 bg-muted/40 p-3">
      <Sidebar active={active} onSelect={setActive} />
      {agent ? (
        <ChatPanel key={agent.id} agent={agent} />
      ) : active.kind === "settings" ? (
        <SettingsPanel />
      ) : (
        <KanbanBoard />
      )}
    </div>
  );
}
