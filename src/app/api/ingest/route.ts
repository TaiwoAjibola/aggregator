import { NextResponse } from "next/server";

import { FEEDS } from "@/config/feeds";
import { db } from "@/lib/db";
import { ingestFeed } from "@/lib/ingest";

export const runtime = "nodejs";

export async function POST() {
  try {
    const configuredFeeds = FEEDS.map((f) => ({
      sourceName: f.sourceName,
      rssUrl: f.rssUrl,
    }));

    const feedsToIngest =
      configuredFeeds.length > 0
        ? configuredFeeds
        : (await db().source.findMany({
            where: { rssUrl: { not: null } },
            select: { name: true, rssUrl: true },
            orderBy: { name: "asc" },
          }))
            .filter((s) => typeof s.rssUrl === "string" && s.rssUrl.length > 0)
            .map((s) => ({ sourceName: s.name, rssUrl: s.rssUrl as string }));

    if (feedsToIngest.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No RSS feeds configured. Add feeds in src/config/feeds.ts (or POST to /api/sources).",
        },
        { status: 400 },
      );
    }

    const results: Array<
      | {
          sourceName: string;
          rssUrl: string;
          ok: true;
          created: number;
          skipped: number;
          total: number;
        }
      | {
          sourceName: string;
          rssUrl: string;
          ok: false;
          error: string;
        }
    > = [];

    for (const feed of feedsToIngest) {
      try {
        const res = await ingestFeed(feed.sourceName, feed.rssUrl);
        results.push({
          sourceName: feed.sourceName,
          rssUrl: feed.rssUrl,
          ok: true,
          created: res.created,
          skipped: res.skipped,
          total: res.total,
        });
      } catch (err) {
        results.push({
          sourceName: feed.sourceName,
          rssUrl: feed.rssUrl,
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

