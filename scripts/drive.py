#!/usr/bin/env python3
"""Drive helper for the Marketing Hub. Runs under the Hermes venv with the
marketing-creative profile's Google credentials.

Usage:
  drive.py fetch <fileId> <destPath>   -> downloads file, prints {"name","mimeType"}
  drive.py tree                        -> prints recursive JSON of the Marketing folder
"""
import io
import json
import os
import sys

sys.path.insert(
    0,
    os.path.expanduser("~/.hermes/skills/productivity/google-workspace/scripts"),
)
import google_api  # noqa: E402
from googleapiclient.http import MediaIoBaseDownload  # noqa: E402

ROOT = "156XYi8KHExQV5lWyaa2ajxGRwIGVd2Oe"


def fetch(file_id: str, dest: str) -> None:
    svc = google_api.build_service("drive", "v3")
    meta = svc.files().get(fileId=file_id, fields="name,mimeType").execute()
    req = svc.files().get_media(fileId=file_id)
    with io.FileIO(dest, "wb") as fh:
        downloader = MediaIoBaseDownload(fh, req)
        done = False
        while not done:
            _, done = downloader.next_chunk()
    print(json.dumps({"name": meta["name"], "mimeType": meta["mimeType"]}))


def tree() -> None:
    svc = google_api.build_service("drive", "v3")

    def walk(fid, depth=0):
        if depth > 4:
            return []
        res = (
            svc.files()
            .list(
                q=f"'{fid}' in parents and trashed=false",
                fields="files(id,name,mimeType,size,modifiedTime,webViewLink)",
                pageSize=500,
            )
            .execute()
        )
        out = []
        for f in sorted(
            res.get("files", []),
            key=lambda x: (x["mimeType"] != "application/vnd.google-apps.folder", x["name"].lower()),
        ):
            node = {
                "id": f["id"],
                "name": f["name"],
                "mimeType": f["mimeType"],
                "size": int(f["size"]) if f.get("size") else None,
                "webViewLink": f.get("webViewLink"),
            }
            if f["mimeType"] == "application/vnd.google-apps.folder":
                node["children"] = walk(f["id"], depth + 1)
            out.append(node)
        return out

    print(json.dumps({"id": ROOT, "name": "Marketing", "children": walk(ROOT)}))


if __name__ == "__main__":
    if sys.argv[1] == "fetch":
        fetch(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == "tree":
        tree()
