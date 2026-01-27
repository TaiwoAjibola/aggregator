import { NextResponse } from "next/server";

import { FEEDS } from "@/config/feeds";
import { db } from "@/lib/db";
import { fetchRssItems } from "@/lib/rss";

export const runtime = "nodejs";

export async function POST() {
  try {
    const configuredFeeds = FEEDS.map((f) => ({
      sourceName: f.sourceName,
      rssUrl: f.rssUrl,
    }));

    const feedsToCheck =
      configuredFeeds.length > 0
        ? configuredFeeds
        : (await db().source.findMany({
            where: { rssUrl: { not: null } },
            select: { name: true, rssUrl: true },
            orderBy: { name: "asc" },
          }))
            .filter((s) => typeof s.rssUrl === "string" && s.rssUrl.length > 0)
            .map((s) => ({ sourceName: s.name, rssUrl: s.rssUrl as string }));

    const results: Array<{
      sourceName: string;
      rssUrl: string;
      ok: boolean;
      itemCount?: number;
      error?: string;
    }> = [];

    for (const feed of feedsToCheck) {
      try {
        const items = await fetchRssItems(feed.rssUrl);
        results.push({
          sourceName: feed.sourceName,
          rssUrl: feed.rssUrl,
          ok: true,
          itemCount: items.length,
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
      { status: 500 }
    );
  }
}
