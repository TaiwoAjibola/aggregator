# Aggregator (MVP)

A neutral, Nigerian-focused news aggregation MVP.

What it does:
- Ingests headlines/excerpts via RSS (free)
- Groups similar items into events (48-hour window)
- Optionally calls a local open-source LLM via Ollama to produce the strict neutral format:
	- Event Title
	- Event Summary
	- Lenses
	- Explanation

## Requirements

- Node.js 20+
- PostgreSQL (via Prisma - Neon.tech or Supabase for cloud)

Optional (for AI summaries):
- **Groq API** (recommended - free tier, ultra-fast) - See [GROQ_SETUP.md](GROQ_SETUP.md)
- **Ollama** (local fallback)

## Setup

1) Install dependencies

- `npm install`

2) Database

- `npm run prisma:migrate`

This creates `dev.db` in the project root.

3) Configure RSS feeds

Option A (recommended): hardcode feeds

Edit [src/config/feeds.ts](src/config/feeds.ts) and add RSS feeds:

```ts
export const FEEDS = [
	{ sourceName: "Example", rssUrl: "https://example.com/feed" },
];
```

Option B: add feeds via API

- POST to `/api/sources` (no UI page):
	- `{ "name": "Premium Times", "rssUrl": "https://www.premiumtimesng.com/feed" }`

4) (Optional) Configure Groq API (Recommended)

Set environment variables in `.env`:

- `GROQ_API_KEY` (get free key at https://console.groq.com)
- `GROQ_MODEL` (default `llama-3.3-70b-versatile`)

See [GROQ_SETUP.md](GROQ_SETUP.md) for detailed setup instructions.

Alternative: Configure Ollama (Local Fallback)

Set environment variables in `.env` (or your shell):

- `OLLAMA_BASE_URL` (default `http://localhost:11434`)
- `OLLAMA_MODEL` (default `llama3.2:latest`)

Recommended laptop-friendly defaults (optional):

- `OLLAMA_NUM_CTX=1024`
- `OLLAMA_NUM_PREDICT=350`
- `OLLAMA_TEMPERATURE=0.2`
- `OLLAMA_TOP_P=0.9`
- `OLLAMA_TIMEOUT_MS=60000`

## Run

- `npm run dev`

API actions:
- Ingest RSS: POST `/api/ingest`
- Group into events: POST `/api/group`
- Check feed health: POST `/api/feeds/check`
- Generate AI summary for an event: button on an event page

## CLI (optional)

- `npm run ingest`
- `npm run group`
- `npm run generate:event -- <eventId>`

## Notes

- The AI is constrained to provided headlines/excerpts/timestamps using the prompt template in [src/lib/prompt.ts](src/lib/prompt.ts).
- The UI always shows original source names and links.

## Performance / low-power mode

If your laptop lags, these settings reduce CPU/RAM usage:

- Limit RSS work:
	- `RSS_MAX_ITEMS_PER_FEED=25`
	- `RSS_EXCERPT_MAX_CHARS=180`
- Limit grouping work:
	- `GROUP_MAX_ITEMS=150`
	- `GROUP_HOURS_WINDOW=24`
- Limit AI prompt size:
	- `AI_MAX_EVENT_ITEMS=8`
	- `AI_MAX_HEADLINE_CHARS=140`
	- `AI_MAX_EXCERPT_CHARS=180`
- Disable AI entirely:
	- `AI_DISABLED=1`
- If you run the hourly worker (`npm run worker`):
	- `WORKER_ENABLED=0` (disable)
	- `WORKER_RUN_ONCE=1` (run once and exit)
	- `WORKER_INTERVAL_MS=7200000` (every 2 hours)
	- `WORKER_FEED_DELAY_MS=500` (pause between feeds)
