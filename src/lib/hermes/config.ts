import path from "node:path";
import os from "node:os";

const HERMES_HOME =
  process.env.HERMES_HOME ?? path.join(os.homedir(), ".hermes");

export const hermesConfig = {
  home: HERMES_HOME,
  bin:
    process.env.HERMES_BIN ??
    path.join(HERMES_HOME, "hermes-agent", "venv", "bin", "hermes"),
  profileStateDb: (profile: string) =>
    path.join(HERMES_HOME, "profiles", profile, "state.db"),
  kanbanDb:
    process.env.HERMES_KANBAN_DB ??
    path.join(HERMES_HOME, "kanban", "boards", "marketing", "kanban.db"),
  kanbanBoard: process.env.HERMES_KANBAN_BOARD ?? "marketing",
  /** Max time to wait for an agent reply, ms */
  chatTimeoutMs: 240_000,
};
