import { FEEDS } from "@/config/feeds";
import { ingestFeed } from "@/lib/ingest";
import { groupRecentItemsIntoEvents } from "@/lib/grouping";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

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

async function runOnce() {
  const startedAt = new Date().toISOString();
  const results = [];

  const feedDelayMs = envInt("WORKER_FEED_DELAY_MS", 250);
  const maxFeeds = envInt("WORKER_MAX_FEEDS", 0);
  const doIngest = process.env.WORKER_DISABLE_INGEST !== "1";
  const doGroup = process.env.WORKER_DISABLE_GROUP !== "1";

  for (const [idx, feed] of FEEDS.entries()) {
    if (maxFeeds > 0 && idx >= maxFeeds) break;
    if (doIngest) {
      results.push(await ingestFeed(feed.sourceName, feed.rssUrl));
    }
    if (feedDelayMs > 0) await sleep(feedDelayMs);
  }

  const grouped = doGroup
    ? await groupRecentItemsIntoEvents({
        hoursWindow: envInt("GROUP_HOURS_WINDOW", 48),
        similarityThreshold: envFloat("GROUP_SIMILARITY_THRESHOLD", 0.42),
        maxItemsToConsider: envInt("GROUP_MAX_ITEMS", 200),
      })
    : null;

  console.log(
    JSON.stringify(
      {
        ok: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        ingest: results,
        group: grouped,
      },
      null,
      2,
    ),
  );
}

async function main() {
  if (process.env.WORKER_ENABLED === "0") {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: "WORKER_ENABLED=0" }, null, 2));
    return;
  }

  if (FEEDS.length === 0) {
    console.error("FEEDS is empty. Configure src/config/feeds.ts");
    process.exitCode = 1;
    return;
  }

  const intervalMs = envInt("WORKER_INTERVAL_MS", 60 * 60 * 1000);
  const runOnceOnly = process.env.WORKER_RUN_ONCE === "1";

  // Run immediately, then on an interval.
  // Note: for hosted production, use a real cron scheduler.
  while (true) {
    try {
      await runOnce();
    } catch (err) {
      console.error(err);
    }

    if (runOnceOnly) break;

    await sleep(intervalMs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
