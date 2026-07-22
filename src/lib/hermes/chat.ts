import { execFile } from "node:child_process";
import { hermesConfig } from "./config";
import { getLastAssistantMessage } from "./sessions";

interface ChatResult {
  reply: string;
  sessionId: string;
}

// One CLI invocation at a time per profile — Hermes handles concurrency
// fine, but interleaved sends to the same thread would misorder turns.
const profileQueues = new Map<string, Promise<unknown>>();

export function sendToProfile(
  profile: string,
  message: string,
  sessionId?: string
): Promise<ChatResult> {
  const prev = profileQueues.get(profile) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => run(profile, message, sessionId));
  profileQueues.set(profile, next);
  return next;
}

function run(
  profile: string,
  message: string,
  sessionId?: string
): Promise<ChatResult> {
  const args = [
    "-p",
    profile,
    "--accept-hooks",
    "chat",
    "-q",
    message,
    "-Q",
    "--source",
    "tool",
  ];
  if (sessionId) args.push("-r", sessionId);

  return new Promise((resolve, reject) => {
    execFile(
      hermesConfig.bin,
      args,
      {
        timeout: hermesConfig.chatTimeoutMs,
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: "1" },
      },
      (error, _stdout, stderr) => {
        // The CLI reports the session id on stderr: "session_id: <id>"
        const reportedId = /session_id:\s*(\S+)/.exec(stderr)?.[1];
        const finalSessionId = reportedId ?? sessionId;

        if (error && !finalSessionId) {
          reject(
            new Error(
              `hermes chat failed (${error.message}): ${stderr.slice(-500)}`
            )
          );
          return;
        }
        if (!finalSessionId) {
          reject(new Error("hermes chat returned no session id"));
          return;
        }

        // stdout mixes reasoning boxes with the reply, so read the
        // authoritative reply from the profile's state.db instead.
        const reply = getLastAssistantMessage(profile, finalSessionId);
        if (reply == null) {
          reject(
            new Error(
              `No reply recorded for session ${finalSessionId}` +
                (error ? ` (${error.message})` : "")
            )
          );
          return;
        }
        resolve({ reply, sessionId: finalSessionId });
      }
    );
  });
}
