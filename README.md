# APOP Marketing Hub

Web control center for the APOP AI marketing team running on Hermes: chat with the agents (Mara — Marketing Manager, Kai — Creative), approve storyboards and publishing from rich cards, and watch the content pipeline on the kanban board.

## Requirements

- Runs on the same machine as Hermes (`~/.hermes`), with the `marketing-manager` and `marketing-creative` profiles and the `marketing` kanban board set up.
- Node 20.9+.

## Run

```bash
npm install
npm run dev -- --port 3333   # port 3000 is taken by the Hermes WhatsApp bridge
```

Open http://localhost:3333.

## How it talks to Hermes

- **Chat**: spawns `hermes -p <profile> --accept-hooks chat -q "<msg>" -Q --source tool` per message, resuming sessions with `-r`. Replies are read from the profile's `state.db` (SQLite, read-only).
- **Kanban**: reads `~/.hermes/kanban/boards/marketing/kanban.db` read-only; the Hermes gateway's dispatcher does all task execution.
- Per-agent thread state lives in `.data/threads.json` (gitignored).

Paths can be overridden with `HERMES_HOME`, `HERMES_BIN`, `HERMES_KANBAN_DB`, `HERMES_KANBAN_BOARD`.

## Approval cards

Agents emit fenced ```json blocks with `{"kind": "storyboard" | "publish", "title": …, "options": [{"id", "label", "summary"}]}` to render interactive approval cards; choosing an option replies "I choose option X." in the thread.
