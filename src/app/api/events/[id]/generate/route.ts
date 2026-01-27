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
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
