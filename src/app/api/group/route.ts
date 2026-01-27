import { NextResponse } from "next/server";

import { groupRecentItemsIntoEvents } from "@/lib/grouping";

export const runtime = "nodejs";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST() {
  const result = await groupRecentItemsIntoEvents({
    hoursWindow: envInt("GROUP_HOURS_WINDOW", 48),
    similarityThreshold: envFloat("GROUP_SIMILARITY_THRESHOLD", 0.42),
    maxItemsToConsider: envInt("GROUP_MAX_ITEMS", 200),
  });
  return NextResponse.json({ ok: true, ...result });
}
