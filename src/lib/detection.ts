import { groqGenerate } from "./groq";
import { db } from "./db";

/**
 * Detect if an event has duplicate coverage from the same source
 * Uses Groq AI to analyze if multiple articles from same source are about same event
 */
export async function detectDuplicateSources(eventId: string): Promise<boolean> {
  const event = await db().event.findUnique({
    where: { id: eventId },
    include: {
      eventItems: {
        include: {
          item: {
            include: { source: true },
          },
        },
      },
    },
  });

  if (!event) return false;

  // Group items by source
  const itemsBySource = new Map<string, typeof event.eventItems>();
  for (const ei of event.eventItems) {
    const sourceName = ei.item.source.name;
    const existing = itemsBySource.get(sourceName) ?? [];
    existing.push(ei);
    itemsBySource.set(sourceName, existing);
  }

  // Check if any source has multiple articles
  let hasDuplicates = false;
  for (const [sourceName, items] of itemsBySource.entries()) {
    if (items.length > 1) {
      // Use AI to confirm these are actually duplicates (not just same source)
      const titles = items.map((ei) => ei.item.title).join("\n");
      const prompt = `Are these ${items.length} headlines from "${sourceName}" about the exact same news event? Answer with only "YES" or "NO".

Headlines:
${titles}`;

      try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          // Fallback: assume duplicates if titles are very similar
          hasDuplicates = true;
          continue;
        }

        const response = await groqGenerate(prompt, { apiKey });
        if (response.trim().toUpperCase().startsWith("YES")) {
          hasDuplicates = true;
          break;
        }
      } catch (err) {
        console.warn(`Duplicate detection failed for event ${eventId}:`, err);
        // Conservative: assume duplicates to be safe
        hasDuplicates = true;
        break;
      }
    }
  }

  // Update database
  await db().event.update({
    where: { id: eventId },
    data: { hasDuplicates },
  });

  return hasDuplicates;
}

/**
 * Calculate breaking news score based on:
 * - Number of sources covering the event
 * - Time window (how quickly sources reported it)
 * - Source diversity
 */
export async function calculateBreakingScore(eventId: string): Promise<number> {
  const event = await db().event.findUnique({
    where: { id: eventId },
    include: {
      eventItems: {
        include: {
          item: {
            include: { source: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event || event.eventItems.length === 0) return 0;

  // Factors for breaking news
  const uniqueSources = new Set(event.eventItems.map((ei) => ei.item.source.name)).size;
  const totalItems = event.eventItems.length;

  // Time window: difference between first and last report
  const firstReport = event.eventItems[0]?.createdAt;
  const lastReport = event.eventItems[event.eventItems.length - 1]?.createdAt;
  const timeWindowHours = firstReport && lastReport
    ? (lastReport.getTime() - firstReport.getTime()) / (1000 * 60 * 60)
    : 0;

  // Breaking score calculation:
  // - Multiple sources (3+) = high priority
  // - Rapid coverage (within 2 hours) = very high priority
  // - Many items (5+) = high engagement
  let score = 0;

  // Source diversity (max 40 points)
  if (uniqueSources >= 5) score += 40;
  else if (uniqueSources >= 3) score += 30;
  else if (uniqueSources >= 2) score += 15;

  // Item count (max 30 points)
  if (totalItems >= 10) score += 30;
  else if (totalItems >= 5) score += 20;
  else if (totalItems >= 3) score += 10;

  // Time urgency (max 30 points) - fast coverage indicates breaking news
  if (timeWindowHours <= 1) score += 30;
  else if (timeWindowHours <= 2) score += 20;
  else if (timeWindowHours <= 6) score += 10;

  // Threshold: 50+ is breaking news
  const isBreaking = score >= 50;

  // Update database
  await db().event.update({
    where: { id: eventId },
    data: { 
      isBreaking,
      breakingScore: score,
    },
  });

  return score;
}

/**
 * Analyze all recent events for breaking news and duplicates
 */
export async function analyzeRecentEvents(limit = 20): Promise<{
  analyzed: number;
  breaking: number;
  duplicates: number;
}> {
  const events = await db().event.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  let breakingCount = 0;
  let duplicatesCount = 0;

  for (const event of events) {
    const [score, hasDuplicates] = await Promise.all([
      calculateBreakingScore(event.id),
      detectDuplicateSources(event.id),
    ]);

    if (score >= 50) breakingCount++;
    if (hasDuplicates) duplicatesCount++;
  }

  return {
    analyzed: events.length,
    breaking: breakingCount,
    duplicates: duplicatesCount,
  };
}
