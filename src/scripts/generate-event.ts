import "dotenv/config";

import { generateEventSummaryWithOllama } from "@/lib/events";

async function main() {
  const eventId = process.argv[2];
  if (!eventId) {
    console.error("Usage: npm run generate:event -- <eventId>");
    process.exitCode = 1;
    return;
  }

  const saved = await generateEventSummaryWithOllama(eventId);
  console.log(JSON.stringify({ ok: true, outputId: saved.id }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
