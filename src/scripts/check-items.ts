import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  // Get first 3 items with body
  const items = await db().item.findMany({
    take: 3,
    select: {
      id: true,
      title: true,
      body: true,
      excerpt: true,
      source: { select: { name: true } },
    },
  });

  console.log("=== Database Items Sample ===\n");
  for (const item of items) {
    console.log(`Source: ${item.source.name}`);
    console.log(`Title: ${item.title.slice(0, 80)}...`);
    console.log(`Body length: ${item.body?.length || 0} chars`);
    console.log(`Excerpt length: ${item.excerpt?.length || 0} chars`);
    console.log(`Body starts with: ${item.body?.slice(0, 100) || "NULL"}...\n`);
  }

  // Also check if any items have body
  const statsCount = await db().item.findMany({
    select: { body: true },
    take: 100,
  });
  
  const itemsWithBody = statsCount.filter(i => i.body && i.body.length > 0).length;
  console.log(`\nItems with body: ${itemsWithBody}/${statsCount.length}`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
