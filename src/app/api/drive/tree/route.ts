import { NextRequest, NextResponse } from "next/server";
import { fetchDriveTree, invalidateDriveTree } from "@/lib/drive";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.has("refresh")) invalidateDriveTree();
    return NextResponse.json(await fetchDriveTree());
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
