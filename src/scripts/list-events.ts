import "dotenv/config";
import { db } from "../lib/db.js";

async function main() {
  const events = await db().event.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      eventItems: {
        include: { item: true },
      },
    },
  });

  if (events.length === 0) {
    console.log("No events found. Run 'npm run ingest && npm run group' first.");
    process.exit(1);
  }

  console.log("\nRecent Events:\n");
  for (const event of events) {
    const sampleTitle = event.eventItems[0]?.item.title || "(no items)";
    console.log(`Event ID: ${event.id}`);
    console.log(`  Items: ${event.eventItems.length}`);
    console.log(`  Sample: ${sampleTitle.substring(0, 100)}...`);
    console.log();
  }

  process.exit(0);
}

main();
