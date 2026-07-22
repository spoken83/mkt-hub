import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PYTHON = path.join(
  os.homedir(),
  ".hermes",
  "hermes-agent",
  "venv",
  "bin",
  "python3"
);
const SCRIPT = path.join(process.cwd(), "scripts", "drive.py");
const CACHE_DIR = path.join(process.cwd(), ".data", "drive-cache");
const TREE_TTL_MS = 5 * 60_000;

const ENV = {
  ...process.env,
  HERMES_HOME: path.join(os.homedir(), ".hermes", "profiles", "marketing-creative"),
};

export interface DriveNode {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  webViewLink?: string;
  children?: DriveNode[];
}

/** Downloads (and caches forever — Drive file ids are immutable content
 * for our workflow) a file; returns local path + metadata. */
export async function fetchDriveFile(
  fileId: string
): Promise<{ filePath: string; name: string; mimeType: string }> {
  if (!/^[\w-]{10,}$/.test(fileId)) throw new Error("bad file id");
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const filePath = path.join(CACHE_DIR, `${fileId}.bin`);
  const metaPath = path.join(CACHE_DIR, `${fileId}.json`);

  if (fs.existsSync(filePath) && fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    return { filePath, ...meta };
  }

  const { stdout } = await execFileAsync(
    PYTHON,
    [SCRIPT, "fetch", fileId, filePath],
    { env: ENV, timeout: 120_000, maxBuffer: 1024 * 1024 }
  );
  const meta = JSON.parse(stdout.trim());
  fs.writeFileSync(metaPath, JSON.stringify(meta));
  return { filePath, name: meta.name, mimeType: meta.mimeType };
}

export async function fetchDriveTree(): Promise<DriveNode> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const treePath = path.join(CACHE_DIR, "tree.json");
  try {
    const stat = fs.statSync(treePath);
    if (Date.now() - stat.mtimeMs < TREE_TTL_MS) {
      return JSON.parse(fs.readFileSync(treePath, "utf8"));
    }
  } catch {
    // no cache yet
  }
  const { stdout } = await execFileAsync(PYTHON, [SCRIPT, "tree"], {
    env: ENV,
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const tree = JSON.parse(stdout.trim());
  fs.writeFileSync(treePath, JSON.stringify(tree));
  return tree;
}

/** Drops the cached tree so the next fetch is fresh. */
export function invalidateDriveTree(): void {
  try {
    fs.unlinkSync(path.join(CACHE_DIR, "tree.json"));
  } catch {
    // fine
  }
}
