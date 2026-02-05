import { autoExtractAndSummarize } from "../lib/autoSummarize";

async function main() {
  const maxEvents = Number(process.argv[2]) || 20;
  
  await autoExtractAndSummarize({
    maxEvents,
    onlyWithoutSummary: true,
    extractArticles: true,
  });
  
  process.exit(0);
}

main().catch((err) => {
  console.error("Auto-summarization failed:", err);
  process.exit(1);
});
