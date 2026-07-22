export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Guard against double-registration (dev hot reload re-imports).
  const g = globalThis as { __briefingTimer?: ReturnType<typeof setInterval> };
  if (g.__briefingTimer) return;

  const { briefingTick } = await import("./lib/briefing");
  const { kanbanWatchTick } = await import("./lib/team");
  const { readTaskSummaries } = await import("./lib/hermes/kanban");
  g.__briefingTimer = setInterval(() => {
    briefingTick().catch((err) => console.error("[briefing] tick error:", err));
    kanbanWatchTick(readTaskSummaries).catch((err) =>
      console.error("[team] kanban watch error:", err)
    );
  }, 60_000);
  console.log("[briefing] scheduler + kanban watcher started");
}
