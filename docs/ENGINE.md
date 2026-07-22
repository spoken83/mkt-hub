# Marketing Hub Engine — Specification (Phase 3)

> Status: DRAFT for Gordon's review — no code yet
> Decisions locked 23 Jul 2026: scope-first · keep model mix (DeepSeek V4 Pro for Mara, Claude Sonnet for Kai, via OpenRouter) · Neon Postgres from day one
> Canonical copy: this file. Vault has an executive summary.

## 1. Why replace the Hermes engine

The Hub's UI, personas and workflow are solid; the engine underneath is rented machinery patched per incident. Documented failures from 22–23 Jul alone:

| Incident | Root cause | Class |
|---|---|---|
| Mara claimed she had no Instagram access | Capabilities live in skills that aren't loaded per session; SOUL.md hand-patched as workaround | Knowledge fragility |
| First static's artifacts lost forever | Kanban scratch workspaces wiped on task completion; upload was best-effort | Data loss |
| Kai copied Gordon's Google token into his own profile | Agents have arbitrary terminal access; credentials are files on disk | Security |
| Hub served a stale reply as if new | CLI timeout + fallthrough; replies scraped from a SQLite file because stdout is polluted | Integration fragility |
| `$0` became `/bin/bash-0` in a brief | Shell interpolation in agent-composed CLI commands | Injection-by-accident |
| Approval cards sometimes plain text | JSON-block convention enforced only by prompt discipline | No schema enforcement |
| 1.5–3s cold start per message, no streaming | Full Python boot per CLI call; blocking one-shot design | UX/latency |
| WhatsApp replies route to Pip, never Mara | Platform inbound is instance-global in Hermes | Architectural dead-end |
| Pip and Claude both editing the same skills/board | No single owner of engine config | Operational drift |

Conclusion: keep the Hub, replace `src/lib/hermes/` with our own engine.

## 2. Goals / non-goals

**Goals**
1. Own the agent loop: model calls, tools, sessions, queue, scheduler — all in TypeScript we control, versioned in this repo.
2. Zero UI change at cutover: engine implements the same surface the UI already consumes (chat, team, post threads, pipeline, calendar, briefing).
3. Structural fixes, not conventions: schema-enforced approval cards, mandatory artifact upload before job completion, scoped per-agent credentials, no arbitrary shell.
4. Streaming replies; sub-second first token; no per-message process boot.
5. SaaS-portable: tenancy column from day one; Mac mini → cloud is a hosting move, not a rewrite.

**Non-goals**
- Touching Pip / WhatsApp / Cara — Hermes remains their engine indefinitely.
- Changing the creative toolchain (Higgsfield CLI, HTML-render slides, Composio, Drive) — same tools, safer harness.
- Multi-tenant auth/billing now (schema-ready only).

## 3. Architecture

```
Next.js app (mkt-hub, launchd on :3333)
├── UI (unchanged)
├── API routes (unchanged paths, new backing)
└── engine/ (new)
    ├── loop.ts        — model-agnostic agent loop (OpenRouter chat + tool calling)
    ├── models.ts      — per-agent model config: mara→deepseek/deepseek-v4-pro,
    │                    kai→anthropic/claude-sonnet-4 (ids pinned at build time)
    ├── tools/         — typed, allowlisted tools (see §5)
    ├── sessions.ts    — conversations in Postgres, sliding-window + summary compaction
    ├── queue.ts       — Postgres job queue (briefs), SKIP LOCKED claiming, heartbeats
    ├── worker.ts      — in-process worker pool executing jobs via the same loop
    ├── scheduler.ts   — cron ticks (briefing, publishing duty, watchers) — exists, moves here
    ├── stream.ts      — SSE token streaming to the UI
    └── audit.ts       — every tool call + credential use logged to Postgres
Neon Postgres (cloud) ← all engine state
Local staging dir     ← job artifacts, wiped ONLY after verified Drive upload
```

The engine runs inside the existing Next.js server process (worker included). If job load ever warrants it, worker.ts can split into its own process without schema changes.

## 4. Data model (Neon Postgres)

All tables carry `tenant_id text NOT NULL DEFAULT 'apop'`.

- `agents` — id, name, role, model, system_prompt (versioned via migration), enabled tool list, credential scope. Personas move OUT of Hermes SOUL files INTO the repo (checked in, reviewed like code).
- `sessions` — id, agent_id, channel (`dm` | `team` | `post:<entry_id>` | `job:<job_id>`), created_at.
- `messages` — session_id, role, content, tool_calls jsonb, tokens, created_at.
- `jobs` — id, title, brief, assignee agent_id, status (`triage|todo|running|blocked|review|done|failed`), priority, created_by, calendar_entry_id, claim/heartbeat columns, result jsonb.
- `job_events` — audit trail of every transition.
- `calendar_entries` — ports `.data/calendar.json` (id, date, title, status, caption, drive_links, kanban→job link, vertical, content_type, notes).
- `threads` — ports team chat + post threads (channel, author, content, approval jsonb).
- `settings` — ports `.data/settings.json`.
- `audit_log` — actor, tool, args (secrets redacted), result summary, ts.
- `credentials` — per-agent scoped secrets, encrypted at rest with a key kept only on the Mac mini (NOT in Neon), so DB compromise ≠ credential compromise.

Migration tooling: Drizzle (house standard — same as finance-tracker/sgproperty).

## 5. Tool layer (the security fix)

No general-purpose terminal. Each agent gets explicit, typed tools; every call audited; every credential injected by the engine, never readable by the agent.

| Tool | Backing | Mara | Kai |
|---|---|---|---|
| `social.read` / `social.publish` | Composio CLI wrapped with execFile + arg schema (no shell) | ✅ | – |
| `web.search` | Brave API | ✅ | ✅ |
| `web.read` | Firecrawl API | ✅ | ✅ |
| `image.generate` | Higgsfield CLI wrapped (execFile) | – | ✅ |
| `slide.render` | Headless-Chrome HTML→PNG renderer (formalises Kai's technique) | – | ✅ |
| `drive.upload/list/get` | Google API, service creds scoped to the Marketing folder only | – | ✅ |
| `calendar.*` | Direct DB (no more curl-the-Hub) | ✅ | ✅ |
| `jobs.*` | Queue CRUD (Mara briefs, Kai claims/completes) | ✅ | ✅ (own jobs) |
| `approval.request` | **Forced tool** — storyboard/publish cards are schema-validated tool calls, never markdown blocks | ✅ | – |
| `files.staging` | Read/write ONLY inside the job's staging dir | – | ✅ |

Job completion is **blocked** unless declared deliverables are uploaded and linked — artifact loss becomes impossible by construction.

## 6. Model strategy

Per decision: keep today's mix via OpenRouter — Mara on DeepSeek V4 Pro (strategy/analysis), Kai on Claude Sonnet (creative/tool use). `models.ts` isolates this so either agent can be re-pointed by config. Both models support tool calling through OpenRouter's unified API; exact model ids re-validated when implementation starts. Add fallback chain (as Hermes had) and per-agent token budgets with daily spend caps surfaced in Settings.

## 7. Migration plan (strangler — Hermes stays up throughout)

| Stage | Scope | Parity gate | Rollback |
|---|---|---|---|
| 0 | Schema + Neon setup; port calendar/settings/threads data; UI reads via engine | Calendar/team/pipeline views identical | Point reads back at JSON files |
| 1 | Chat: DM + team + post threads on engine loop w/ streaming; approval cards as forced tools | Mara & Kai converse; cards render; Composio/Drive work | Env flag flips adapter back to Hermes CLI |
| 2 | Jobs: briefs → engine queue + worker; staging + mandatory upload | One brief end-to-end: storyboard → confirm → Kai job → Drive → For Approval | Recreate task on Hermes board |
| 3 | Scheduler: briefing + publishing duty + watchers on engine | 8am briefing lands in team chat; scheduled post published | Re-enable current instrumentation path |
| 4 | Decommission: marketing profiles archived, symlinks/SOUL hacks removed, kanban board frozen read-only | One week clean operation | Profiles kept archived 30 days |
| 5 | (Later, separate) SaaS: auth, tenancy activation, cloud hosting, onboarding | — | — |

Estimate at Hub-quality pace: Stage 0–1 one focused day, Stage 2–3 another, Stage 4 after a week's soak. No hard deadline implied — gates over dates.

## 8. Risks & open questions

1. **DeepSeek tool-calling reliability** for the forced `approval.request` tool — needs a spike early in Stage 1; fallback is re-pointing Mara's card-emission to a stricter model for that single call.
2. **Neon latency from the Mac mini** (~SG region available) — engine batches DB writes; chat hot path keeps one round trip.
3. **Composio/Higgsfield CLI drift** — wrapped behind tools with contract tests, so breakage is detected, not discovered mid-brief.
4. **Who owns what after cutover** — proposal: engine config/personas owned in this repo (PR-able); Pip stops editing marketing skills (they retire with the profiles).
5. **Team-chat multi-agent semantics** — engine keeps the Hub-orchestrated transcript model (it works); native multi-agent rooms are a SaaS-era question.

## 9. What Gordon should sanity-check before green-lighting

- §5 tool table: any capability the agents have today that's missing?
- §7 Stage 4: comfortable retiring the Hermes marketing profiles, keeping Pip untouched?
- Budget caps in Settings: sensible daily spend limits per agent?
- Neon project: reuse an existing account/org or create a fresh project for the Hub?
