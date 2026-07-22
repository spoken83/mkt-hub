#!/bin/bash
# Marketing Hub production server. Port 3333 — 3000 belongs to the Hermes WhatsApp bridge.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/froisagent/workspace/mkt-hub
exec npx next start -p 3333
