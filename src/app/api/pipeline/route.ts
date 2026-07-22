import { NextResponse } from "next/server";
import { readPipeline } from "@/lib/pipeline";

export async function GET() {
  try {
    return NextResponse.json({ columns: readPipeline() });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
