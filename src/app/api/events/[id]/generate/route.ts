import "dotenv/config";
import { NextRequest, NextResponse } from "next/server";

import { generateEventSummaryWithOllama } from "@/lib/events";

export const runtime = "nodejs";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const saved = await generateEventSummaryWithOllama(id);
    return NextResponse.json({ ok: true, outputId: saved.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`AI generation failed for event ${id}: ${message}`);
    // Return 200 with error message instead of 500 so UI can show it gracefully
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
