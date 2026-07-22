import { NextRequest, NextResponse } from "next/server";
import { createEntry, loadCalendar } from "@/lib/calendar";
import type { CalendarStatus } from "@/lib/calendar-shared";

const STATUSES: CalendarStatus[] = ["planned", "scheduled", "posted"];

export async function GET() {
  return NextResponse.json({ entries: loadCalendar() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.title !== "string" ||
    !body.title.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "") ||
    !STATUSES.includes(body.status)
  ) {
    return NextResponse.json(
      {
        error:
          "Required: title (string), date (YYYY-MM-DD), status (planned|scheduled|posted). Optional: vertical, contentType, notes, kanbanTaskId, driveLinks.",
      },
      { status: 400 }
    );
  }
  const entry = createEntry({
    title: body.title.trim(),
    date: body.date,
    status: body.status,
    vertical: body.vertical || undefined,
    contentType: body.contentType || undefined,
    notes: body.notes || undefined,
    caption: body.caption || undefined,
    kanbanTaskId: body.kanbanTaskId || undefined,
    driveLinks: Array.isArray(body.driveLinks) ? body.driveLinks : undefined,
  });
  return NextResponse.json({ entry }, { status: 201 });
}
