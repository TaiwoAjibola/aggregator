import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";

export const runtime = "nodejs";

const UpsertSourceSchema = z.object({
  name: z.string().min(1),
  rssUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const sources = await db().source.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, sources });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = UpsertSourceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload" },
      { status: 400 },
    );
  }

  const { name, rssUrl } = parsed.data;
  const normalizedUrl = rssUrl ? rssUrl.trim() : undefined;

  const source = await db().source.upsert({
    where: { name },
    create: { name, rssUrl: normalizedUrl || null },
    update: { rssUrl: normalizedUrl || null },
  });

  return NextResponse.json({ ok: true, source });
}
