import { db } from "@/lib/db";
import { jaccardSimilarity, tokenize } from "@/lib/text";

export type GroupingOptions = {
  hoursWindow?: number;
  similarityThreshold?: number;
  maxItemsToConsider?: number;
};

function withinHours(a: Date | null | undefined, b: Date | null | undefined, hours: number): boolean {
  if (!a || !b) return true;
  const deltaMs = Math.abs(a.getTime() - b.getTime());
  return deltaMs <= hours * 60 * 60 * 1000;
}

export async function groupRecentItemsIntoEvents(options: GroupingOptions = {}) {
  const hoursWindow = options.hoursWindow ?? 48;
  const similarityThreshold = options.similarityThreshold ?? 0.42;
  const maxItemsToConsider = options.maxItemsToConsider ?? 200;

  const items = await db().item.findMany({
    orderBy: { publishedAt: "desc" },
    take: maxItemsToConsider,
    include: { source: true },
  });

  // Consider only items with any timestamp; fallback to fetchedAt if publishedAt is missing.
  type ItemWithTime = (typeof items)[number] & { effectiveAt: Date };
  const itemsWithTime: ItemWithTime[] = items.map((it) => ({
    ...it,
    effectiveAt: it.publishedAt ?? it.fetchedAt,
  }));

  // Load existing events that are still "active" in the window.
  const cutoff = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
  const activeEvents = await db().event.findMany({
    where: {
      OR: [{ endAt: { gte: cutoff } }, { endAt: null }],
    },
    include: {
      eventItems: {
        include: { item: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 120,
  });

  const itemIdsToConsider = itemsWithTime.map((it) => it.id);
  const existingItemIds = new Set(
    (
      await db().eventItem.findMany({
        where: { itemId: { in: itemIdsToConsider } },
        select: { itemId: true },
      })
    ).map((x) => x.itemId),
  );

  let createdEvents = 0;
  let linkedItems = 0;

  for (const item of itemsWithTime) {
    if (existingItemIds.has(item.id)) continue;

    const itemTokens = tokenize(item.title);
    if (itemTokens.length === 0) continue;

    let bestEvent: (typeof activeEvents)[number] | null = null;
    let bestScore = 0;

    for (const event of activeEvents) {
      const eventTime = event.endAt ?? event.startAt ?? null;
      if (!withinHours(item.effectiveAt, eventTime, hoursWindow)) continue;

      // Compare against a few recent items in the event.
      let localBest = 0;
      for (const ei of event.eventItems) {
        const candidateTokens = tokenize(ei.item.title);
        const score = jaccardSimilarity(itemTokens, candidateTokens);
        if (score > localBest) localBest = score;
      }

      if (localBest > bestScore) {
        bestScore = localBest;
        bestEvent = event;
      }
    }

    if (!bestEvent || bestScore < similarityThreshold) {
      const newEvent = await db().event.create({
        data: {
          startAt: item.effectiveAt,
          endAt: item.effectiveAt,
          itemCount: 0,
        },
      });

      const fullEvent = {
        ...newEvent,
        eventItems: [],
        aiOutputs: [],
      } as unknown as (typeof activeEvents)[number];
      activeEvents.unshift(fullEvent);
      bestEvent = fullEvent;
      bestScore = 1;
      createdEvents += 1;
    }

    await db().eventItem.create({
      data: {
        eventId: bestEvent.id,
        itemId: item.id,
        similarity: bestScore,
      },
    });

    await db().event.update({
      where: { id: bestEvent.id },
      data: {
        startAt: bestEvent.startAt ? (item.effectiveAt < bestEvent.startAt ? item.effectiveAt : bestEvent.startAt) : item.effectiveAt,
        endAt: bestEvent.endAt ? (item.effectiveAt > bestEvent.endAt ? item.effectiveAt : bestEvent.endAt) : item.effectiveAt,
        itemCount: { increment: 1 },
      },
    });

    linkedItems += 1;
    existingItemIds.add(item.id);
  }

  return { createdEvents, linkedItems, consideredItems: itemsWithTime.length };
}
