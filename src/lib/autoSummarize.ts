import "dotenv/config";
import { db } from "../lib/db";
import { extractArticleContent } from "../lib/articleExtractor";
import { generateEventSummaryWithOllama } from "../lib/events";

/**
 * Automatically extract full articles and generate AI summaries for recent events
 */
export async function autoExtractAndSummarize(
  options: {
    maxEvents?: number;
    onlyWithoutSummary?: boolean;
    extractArticles?: boolean;
  } = {}
) {
  const {
    maxEvents = 20,
    onlyWithoutSummary = true,
    extractArticles = true,
  } = options;

  console.log("🤖 Starting automatic extraction and summarization...\n");

  // Find recent events
  const events = await db().event.findMany({
    where: onlyWithoutSummary ? {
      aiOutputs: { none: {} }  // Only events without AI summaries
    } : undefined,
    orderBy: { updatedAt: "desc" },
    take: maxEvents,
    include: {
      eventItems: {
        include: {
          item: true,
        },
      },
      aiOutputs: true,
    },
  });

  console.log(`📊 Found ${events.length} events to process\n`);

  let extracted = 0;
  let summarized = 0;
  let skipped = 0;
  let errors = 0;

  for (const event of events) {
    console.log(`\n📰 Processing event: ${event.id.slice(0, 12)}...`);
    
    try {
      // Step 1: Extract full articles if enabled and items don't have body
      if (extractArticles) {
        for (const ei of event.eventItems) {
          if (!ei.item.body && ei.item.url) {
            console.log(`  📄 Extracting: ${ei.item.title.slice(0, 60)}...`);
            
            try {
              const content = await extractArticleContent(ei.item.url);
              
              if (content?.content) {
                await db().item.update({
                  where: { id: ei.item.id },
                  data: { body: content.content },
                });
                extracted++;
                console.log(`    ✓ Extracted ${content.content.length} chars`);
              } else {
                console.log(`    ⚠ No content extracted`);
              }
            } catch (err) {
              console.log(`    ✗ Extraction failed: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      }

      // Step 2: Generate AI summary if event doesn't have one
      if (event.aiOutputs.length === 0) {
        console.log(`  🤖 Generating AI summary...`);
        
        try {
          await generateEventSummaryWithOllama(event.id);
          summarized++;
          console.log(`    ✓ Summary generated`);
        } catch (err) {
          console.log(`    ✗ Summary failed: ${err instanceof Error ? err.message : String(err)}`);
          errors++;
        }
      } else {
        console.log(`  ⏭ Already has summary, skipping`);
        skipped++;
      }
    } catch (err) {
      console.error(`  ✗ Error processing event: ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }
  }

  const result = {
    ok: true,
    processed: events.length,
    extracted,
    summarized,
    skipped,
    errors,
  };

  console.log("\n" + "=".repeat(50));
  console.log("📊 Results:");
  console.log(`  Events processed: ${result.processed}`);
  console.log(`  Articles extracted: ${result.extracted}`);
  console.log(`  Summaries generated: ${result.summarized}`);
  console.log(`  Skipped (already done): ${result.skipped}`);
  console.log(`  Errors: ${result.errors}`);
  console.log("=".repeat(50) + "\n");

  return result;
}
