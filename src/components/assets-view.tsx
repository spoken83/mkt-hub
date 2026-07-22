"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  FileText,
  Folder,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface DriveNode {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  webViewLink?: string;
  children?: DriveNode[];
}

const isFolder = (n: DriveNode) =>
  n.mimeType === "application/vnd.google-apps.folder";
const isImage = (n: DriveNode) => n.mimeType.startsWith("image/");

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1000)} KB`;
}

export function AssetsView() {
  const [tree, setTree] = useState<DriveNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Breadcrumb path of folder nodes, root first.
  const [pathStack, setPathStack] = useState<DriveNode[]>([]);
  const [preview, setPreview] = useState<DriveNode | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      const res = await fetch(`/api/drive/tree${refresh ? "?refresh=1" : ""}`);
      if (!res.ok) throw new Error(`Drive unavailable (${res.status})`);
      const data: DriveNode = await res.json();
      setTree(data);
      setPathStack((prev) => {
        // Re-anchor the breadcrumb in the fresh tree by ids.
        let node: DriveNode | undefined = data;
        const next: DriveNode[] = [data];
        for (const crumb of prev.slice(1)) {
          node = node?.children?.find((c) => c.id === crumb.id);
          if (!node) break;
          next.push(node);
        }
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Drive");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const current = pathStack.at(-1);
  const items = current?.children ?? [];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3">
      <header className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Assets</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {pathStack.map((node, i) => (
              <span key={node.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5" />}
                <button
                  type="button"
                  className="hover:text-foreground hover:underline"
                  onClick={() => setPathStack(pathStack.slice(0, i + 1))}
                >
                  {node.name}
                </button>
              </span>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Refresh
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-card p-4 shadow-sm">
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : loading || !tree ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((node) =>
              isFolder(node) ? (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setPathStack([...pathStack, node])}
                  className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl border bg-muted/40 p-3 transition-colors hover:border-primary/40"
                >
                  <Folder className="size-9 text-primary/70" />
                  <span className="line-clamp-2 text-center text-sm font-medium">
                    {node.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {node.children?.length ?? 0} items
                  </span>
                </button>
              ) : (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setPreview(node)}
                  className="flex h-36 flex-col overflow-hidden rounded-xl border transition-colors hover:border-primary/40"
                >
                  {isImage(node) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/drive/${node.id}`}
                      alt={node.name}
                      loading="lazy"
                      className="min-h-0 flex-1 w-full object-cover"
                    />
                  ) : (
                    <span className="flex min-h-0 flex-1 items-center justify-center bg-muted/40">
                      <FileText className="size-8 text-muted-foreground" />
                    </span>
                  )}
                  <span className="truncate px-2 py-1.5 text-left text-xs">
                    {node.name}
                    <span className="ml-1 text-muted-foreground">
                      {formatSize(node.size)}
                    </span>
                  </span>
                </button>
              )
            )}
            {items.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">
                Empty folder
              </p>
            )}
          </div>
        )}
      </div>

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="truncate">{preview?.name}</span>
              {preview?.webViewLink && (
                <a
                  href={preview.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="Open in Google Drive"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          {preview &&
            (isImage(preview) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/drive/${preview.id}`}
                alt={preview.name}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
            ) : (
              <iframe
                src={`/api/drive/${preview.id}`}
                className="h-[60vh] w-full rounded-lg border"
                title={preview.name}
              />
            ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
