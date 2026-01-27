import { db } from "@/lib/db";
import { fetchRssItems } from "@/lib/rss";
import { stableHash } from "@/lib/text";

export async function upsertSource(sourceName: string, rssUrl?: string) {
  return db().source.upsert({
    where: { name: sourceName },
    create: { name: sourceName, rssUrl },
    update: { rssUrl },
  });
}

export async function ingestFeed(sourceName: string, rssUrl: string) {
  const source = await upsertSource(sourceName, rssUrl);
  const fetchedAt = new Date();

  const parsedItems = await fetchRssItems(rssUrl);

  let created = 0;
  let skipped = 0;

  for (const item of parsedItems) {
    const keyParts = [sourceName, item.title, item.url ?? "", item.publishedAt?.toISOString() ?? ""];
    const hash = stableHash(keyParts.join("|"));

    try {
      await db().item.create({
        data: {
          sourceId: source.id,
          title: item.title,
          excerpt: item.excerpt,
          url: item.url,
          publishedAt: item.publishedAt,
          fetchedAt,
          hash,
        },
      });
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  return { source: source.name, created, skipped, total: parsedItems.length };
}
