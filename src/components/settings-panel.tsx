"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Play, Save } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { ALL_VERTICALS, type MarketingSettings } from "@/lib/settings-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EngineInfo {
  agentId: string;
  profile: string;
  model: string;
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<MarketingSettings | null>(null);
  const [engine, setEngine] = useState<EngineInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings);
        setEngine(data.engine ?? []);
      })
      .catch(() => setStatus("Couldn't load settings"));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setStatus("Saved");
    } catch {
      setStatus("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunningNow(true);
    setStatus(null);
    try {
      const res = await fetch("/api/briefing", { method: "POST" });
      if (!res.ok) throw new Error(`${res.status}`);
      setStatus("Briefing done — check Mara's chat for the storyboard");
    } catch {
      setStatus("Briefing failed — see server logs");
    } finally {
      setRunningNow(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex h-full min-w-0 flex-1 items-center justify-center rounded-2xl border bg-card">
        <p className="text-sm text-muted-foreground">{status ?? "Loading settings…"}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
      <header className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Marketing settings</h2>
        <p className="text-sm text-muted-foreground">
          The Hub owns the marketing workflow — the old Hermes cron stays off.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4" />
            Daily briefing
          </CardTitle>
          <CardDescription>
            Mara runs her routine and drops the weekly storyboard into her chat
            as an approval card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="briefing-enabled">Enabled</Label>
            <Switch
              id="briefing-enabled"
              checked={settings.briefing.enabled}
              onCheckedChange={(enabled) =>
                setSettings({
                  ...settings,
                  briefing: { ...settings.briefing, enabled },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="briefing-time">Time (SGT)</Label>
            <Input
              id="briefing-time"
              type="time"
              value={settings.briefing.time}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  briefing: { ...settings.briefing, time: e.target.value },
                })
              }
              className="w-32"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="briefing-nudge">WhatsApp nudge</Label>
              <p className="text-xs text-muted-foreground">
                One line via Pip: &ldquo;storyboard ready in the Hub&rdquo; — no long
                summaries, no broken replies.
              </p>
            </div>
            <Switch
              id="briefing-nudge"
              checked={settings.briefing.whatsappNudge}
              onCheckedChange={(whatsappNudge) =>
                setSettings({
                  ...settings,
                  briefing: { ...settings.briefing, whatsappNudge },
                })
              }
            />
          </div>
          <div className="flex items-center gap-2 border-t pt-3">
            <Button size="sm" variant="outline" onClick={runNow} disabled={runningNow}>
              <Play className="mr-1.5 size-3.5" />
              {runningNow ? "Running… (takes a few minutes)" : "Run briefing now"}
            </Button>
            {settings.briefing.lastRunDate && (
              <span className="text-xs text-muted-foreground">
                Last auto-run: {settings.briefing.lastRunDate}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vertical focus</CardTitle>
          <CardDescription>
            Storyboard options will concentrate on the selected verticals.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ALL_VERTICALS.map((vertical) => {
            const active = settings.verticals.includes(vertical);
            return (
              <button
                key={vertical}
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    verticals: active
                      ? settings.verticals.filter((v) => v !== vertical)
                      : [...settings.verticals, vertical],
                  })
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:border-primary/40"
                )}
              >
                {vertical}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business context</CardTitle>
          <CardDescription>
            Injected into every briefing — new clients, campaigns, things Mara
            should know this week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.businessContext}
            onChange={(e) =>
              setSettings({ ...settings, businessContext: e.target.value })
            }
            placeholder="e.g. New F&B client onboarding this week; push the AI oral practice case study."
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engine (Hermes)</CardTitle>
          <CardDescription>
            Models and skills live in Hermes profiles — shown here read-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {engine.map((info) => {
            const agent = AGENTS.find((a) => a.id === info.agentId);
            return (
              <div
                key={info.agentId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <span className="text-sm font-medium">{agent?.name ?? info.agentId}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    profile: {info.profile}
                  </span>
                </div>
                <Badge variant="secondary">{info.model}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-1.5 size-4" />
          {saving ? "Saving…" : "Save settings"}
        </Button>
        {status && <span className="text-sm text-muted-foreground">{status}</span>}
      </div>
    </div>
  );
}
