"use client";

import { useState } from "react";
import { getAgent } from "@/lib/agents";
import { AssetsView } from "@/components/assets-view";
import { CalendarView } from "@/components/calendar-view";
import { ChatPanel } from "@/components/chat-panel";
import { ContentPipeline } from "@/components/content-pipeline";
import { SettingsPanel } from "@/components/settings-panel";
import { Sidebar, type ActiveView } from "@/components/sidebar";
import { TeamChat } from "@/components/team-chat";

export default function Home() {
  const [active, setActive] = useState<ActiveView>({ kind: "team" });

  const agent = active.kind === "agent" ? getAgent(active.agentId) : undefined;

  return (
    <div className="flex h-dvh gap-3 bg-muted/40 p-3">
      <Sidebar active={active} onSelect={setActive} />
      {agent ? (
        <ChatPanel key={agent.id} agent={agent} />
      ) : active.kind === "team" ? (
        <TeamChat />
      ) : active.kind === "calendar" ? (
        <CalendarView />
      ) : active.kind === "assets" ? (
        <AssetsView />
      ) : active.kind === "settings" ? (
        <SettingsPanel />
      ) : (
        <ContentPipeline />
      )}
    </div>
  );
}
