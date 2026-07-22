import { NextResponse } from "next/server";
import { readBoard } from "@/lib/hermes/kanban";

export async function GET() {
  try {
    return NextResponse.json(readBoard());
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
