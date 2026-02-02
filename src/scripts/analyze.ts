import "dotenv/config";
import { analyzeRecentEvents } from "../lib/detection";

async function main() {
  console.log("Analyzing events for breaking news and duplicate sources...\n");
  
  const result = await analyzeRecentEvents(50);
  
  console.log("Analysis complete:");
  console.log(`- Analyzed: ${result.analyzed} events`);
  console.log(`- Breaking news: ${result.breaking} events`);
  console.log(`- Has duplicates: ${result.duplicates} events`);
  
  process.exit(0);
}

main().catch((err) => {
  console.error("Analysis failed:", err);
  process.exit(1);
});
