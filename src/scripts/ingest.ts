import "dotenv/config";

import { FEEDS } from "@/config/feeds";
import { db } from "@/lib/db";
import { ingestFeed } from "@/lib/ingest";

async function main() {
  const configuredFeeds = FEEDS.map((f) => ({
    sourceName: f.sourceName,
    rssUrl: f.rssUrl,
  }));

  const dbFeeds = await db().source.findMany({
    where: { rssUrl: { not: null } },
    select: { name: true, rssUrl: true },
    orderBy: { name: "asc" },
  });

  const feedsToIngest = configuredFeeds.length > 0
    ? configuredFeeds
    : dbFeeds
        .filter((s) => typeof s.rssUrl === "string" && s.rssUrl.length > 0)
        .map((s) => ({ sourceName: s.name, rssUrl: s.rssUrl as string }));

  if (feedsToIngest.length === 0) {
    console.error("No RSS feeds configured. Add FEEDS in src/config/feeds.ts (or POST to /api/sources).");
    process.exitCode = 1;
    return;
  }

  const results = [];
  for (const feed of feedsToIngest) {
    results.push(await ingestFeed(feed.sourceName, feed.rssUrl));
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
