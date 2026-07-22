import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { fetchDriveFile } from "@/lib/drive";

export const maxDuration = 120;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await ctx.params;
  try {
    const { filePath, name, mimeType } = await fetchDriveFile(fileId);
    const body = fs.readFileSync(filePath);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
