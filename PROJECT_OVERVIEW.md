# Nigerian News Aggregator - Project Overview

**Last Updated:** February 2, 2026  
**Version:** MVP (0.1.0)  
**Architecture:** Transitioning from Laptop-Bound to Cloud-Free Permanent Deployment

---

## Architecture Migration

The project is designed to transition from a laptop-bound development setup to a permanent, cloud-free production deployment:

| Component | Current (Laptop-bound) | Permanent (Cloud-Free) |
|-----------|------------------------|------------------------|
| **Worker/Cron** | Laptop Terminal | GitHub Actions (scheduled workflows) |
| **Extraction** | RSS Excerpt only | @extractus/article-extractor (on-demand full-text) |
| **AI Summaries** | Local Ollama | Groq API (Free Tier) |
| **Database** | Local Postgres | Neon.tech or Supabase (Free Tier Postgres) |

**Benefits of the new architecture:**
- ✅ **Zero Infrastructure Costs:** Free tiers for all services
- ✅ **24/7 Availability:** GitHub Actions runs on schedule, no laptop required
- ✅ **Better Content:** Full article extraction vs. RSS excerpts only
- ✅ **Faster AI:** Groq API is optimized for speed vs. local laptop inference
- ✅ **Cloud Persistence:** Managed Postgres database accessible anywhere
- ✅ **Scalability:** Can handle more sources and traffic without laptop constraints

---

## Project Purpose

This is a **neutral, Nigerian-focused news aggregation platform** that collects, groups, and optionally summarizes news from multiple Nigerian media sources using AI. The system is designed to provide balanced news coverage by:

- Aggregating headlines from multiple RSS feeds
- Automatically grouping similar stories into "events"
- Optionally generating neutral, balanced summaries using AI
- Always showing original source attributions and links

---

## Tech Stack

### Core Technologies
- **Framework:** Next.js 16.1.4 (React 19.2.3)
- **Database:** PostgreSQL (via Prisma ORM 7.3.0)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Runtime:** Node.js 20+

### Key Dependencies
- **rss-parser** (3.13.0) - RSS feed parsing
- **zod** (4.3.5) - Schema validation
- **tsx** (4.21.0) - TypeScript execution for CLI scripts
- **dotenv** (17.2.3) - Environment configuration

### AI Options
**Current (Laptop):**
- **Ollama** - Local LLM inference (recommended: llama3.2:latest)
- **HuggingFace** - Cloud-based inference API (google/flan-t5-base)

**Permanent (Cloud-Free):**
- **Groq API** - Ultra-fast LLM inference with generous free tier (recommended: llama-3.3-70b-versatile)

### Article Extraction
**Current:** RSS excerpts only (limited content)  
**Planned:** @extractus/article-extractor - Full-text article extraction on-demand

### Database Hosting
**Current:** Local PostgreSQL  
**Planned:** Neon.tech or Supabase (Free Tier managed Postgres)

### Automation
**Current:** Manual execution or local worker script  
**Planned:** GitHub Actions (scheduled cron workflows)

---

## Architecture Overview

### Data Flow
```
RSS Feeds → Ingest → Items (Database) → Grouping Algorithm → Events → AI Summary (Optional) → Web UI
```

### Database Schema

#### 1. **Source** Table
Represents news sources (e.g., Premium Times, Punch, Vanguard)
- `id` (CUID)
- `name` (unique)
- `rssUrl` (nullable)
- Timestamps: `createdAt`, `updatedAt`

#### 2. **Item** Table
Individual news articles/headlines fetched from RSS feeds
- `id` (CUID)
- `sourceId` (foreign key → Source)
- `title`, `excerpt`, `body`
- `url` (link to original article)
- `publishedAt`, `fetchedAt`
- `hash` (unique identifier for deduplication)

#### 3. **Event** Table
Groups of related news items (similar stories)
- `id` (CUID)
- `startAt`, `endAt` (time window for the event)
- `itemCount` (number of related items)
- `key` (optional unique identifier)
- Timestamps: `createdAt`, `updatedAt`

#### 4. **EventItem** Table
Join table linking Items to Events
- `eventId` ↔ `itemId` (many-to-many relationship)
- `similarity` (Jaccard similarity score)
- `createdAt`

#### 5. **EventAiOutput** Table
AI-generated summaries for events
- `eventId` (foreign key → Event)
- `model` (e.g., "llama3.2:latest")
- `promptVersion` (tracking prompt changes)
- `outputText` (the AI-generated summary)
- `createdAt`

---

## Core Functionality

### 1. RSS Ingestion (`src/lib/rss.ts`, `src/lib/ingest.ts`)

**What it does:**
- Fetches RSS feeds from configured sources
- Extracts: title, URL, published date, excerpt, and body text
- Strips CMS boilerplate (WordPress artifacts, "Read more" links, etc.)
- Creates hash-based deduplication to avoid duplicate articles
- Stores items in the database

**Content Extraction:**
- **Current:** RSS excerpt only (typically 180-240 characters)
- **Planned:** Full article extraction using `@extractus/article-extractor`
  - On-demand extraction when viewing event details
  - Bypasses RSS content limits
  - Extracts full article text, images, and metadata

**Configured Sources (9 Nigerian outlets):**
- Premium Times
- Punch
- Vanguard
- Channels TV
- BusinessDay
- ThisDay
- Nigerian Tribune
- Nairametrics
- Daily Post

**Key Features:**
- Configurable limits (RSS_MAX_ITEMS_PER_FEED, RSS_EXCERPT_MAX_CHARS, RSS_BODY_MAX_CHARS)
- Smart text extraction from various RSS formats (content:encoded, description, etc.)
- 15-second timeout per feed

### 2. Event Grouping (`src/lib/grouping.ts`, `src/lib/text.ts`)

**What it does:**
- Groups similar news items into "events" (e.g., multiple outlets covering the same story)
- Uses **Jaccard similarity** on tokenized titles to measure similarity
- Time-window based: groups items within a configurable time range (default: 48 hours)
- Updates existing events when new similar items arrive

**Algorithm:**
1. Fetches recent items (default: last 200 items)
2. Tokenizes headlines (removes stopwords, normalizes text)
3. Compares each item against active events using Jaccard similarity
4. If similarity > threshold (default: 0.42), adds to existing event
5. Otherwise, creates a new event

**Configurable Parameters:**
- `GROUP_HOURS_WINDOW` (default: 48 hours)
- `GROUP_SIMILARITY_THRESHOLD` (default: 0.42)
- `GROUP_MAX_ITEMS` (default: 200)

**Text Processing:**
- Removes common Nigerian stopwords (e.g., "and", "the", "says", "Nigeria")
- Tokenizes on word boundaries
- Case-insensitive matching

### 3. AI Summary Generation (`src/lib/ollama.ts`, `src/lib/huggingface.ts`, `src/lib/prompt.ts`)

**What it does:**
- Generates neutral, structured summaries for events
- Uses a strict prompt template to ensure consistency
- Supports both local (Ollama) and cloud (HuggingFace) inference

**Output Format:**
```
Event Title: [Concise neutral title]
Event Summary: [2-3 sentence summary]
Lenses: [Different perspectives from sources]
Explanation: [Key facts, context, and notable gaps]
Coverage Note: [Metadata about sources and timeframe]
```

**Ollama Configuration (Local):**
- Base URL: http://localhost:11434 (default)
- Model: llama3.2:latest (default)
- Conservative laptop-friendly settings:
  - `num_ctx=1024` (context window)
  - `num_predict=350` (max output tokens)
  - `temperature=0.2` (low randomness for consistency)
  - `top_p=0.9`
- 60-second timeout

**HuggingFace Configuration (Cloud):**
- Model: google/flan-t5-base (default)
- Requires: HF_API_TOKEN environment variable
- 120-second timeout

**Groq Configuration (Cloud-Free - Recommended for Production):**
- Base URL: https://api.groq.com/openai/v1/chat/completions
- Recommended Model: llama-3.3-70b-versatile (fast, accurate)
- Alternative: mixtral-8x7b-32768 (longer context)
- Requires: GROQ_API_KEY environment variable
- Free tier: 30 requests/minute, 6,000 tokens/minute
- Ultra-fast inference (10-20x faster than local Ollama)
- 30-second timeout

**Prompt Constraints:**
- Only uses provided headlines/excerpts (no external knowledge)
- Includes source names and timestamps
- Marks gaps in coverage explicitly
- Limits: max 8 items per event, 140 chars per headline, 180 chars per excerpt

### 4. Background Worker

#### Current: Local Worker (`src/scripts/worker.ts`)
**What it does:**
- Automated hourly ingestion and grouping
- Runs continuously in the background on laptop
- Configurable via environment variables

**Workflow:**
1. Ingest all RSS feeds sequentially (with delay between feeds)
2. Group recent items into events
3. Analyze events for breaking news and duplicate sources
4. Sleep for configured interval (default: 1 hour)
5. Repeat

#### ✅ Implemented: GitHub Actions (Cloud-Free)
**What it does:**
- Scheduled cron workflow runs every 30 minutes
- Runs in GitHub's cloud infrastructure (free for public repos)
- No laptop required - runs 24/7
- Environment secrets managed in GitHub

**Workflow:**
1. GitHub Actions triggers on schedule (`*/30 * * * *`)
2. Checks out repository code
3. Sets up Node.js environment
4. Connects to cloud database (Neon.tech)
5. Runs worker script (ingest → group → analyze)
6. Updates breaking news and duplicate flags
7. Logs results

**Workflow file:** `.github/workflows/aggregate.yml`

**Example cron schedules:**
- Every 30 minutes: `*/30 * * * *` (current)
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`

**Configuration:**
- `WORKER_INTERVAL_MS` (default: 3600000 = 1 hour)
- `WORKER_FEED_DELAY_MS` (default: 250ms between feeds)
- `WORKER_MAX_FEEDS` (limit feed count, 0 = all)
- `WORKER_DISABLE_INGEST` (set to "1" to skip ingestion)
- `WORKER_DISABLE_GROUP` (set to "1" to skip grouping)
- `WORKER_DISABLE_ANALYZE` (set to "1" to skip analysis)
- `ANALYZE_EVENT_LIMIT` (default: 50 recent events)

**Required GitHub Secrets:**
- `DATABASE_URL` - Neon.tech PostgreSQL connection string
- `GROQ_API_KEY` - Groq API key for AI analysis

---

## User Interface

### Pages

#### 1. Home (`/` → redirects to `/events`)
- Simple redirect to events listing

#### 2. Events List (`/events`)
**Features:**
- Shows all grouped events in reverse chronological order
- Each event displays:
  - AI-generated title (if available) or extracted topic from headlines
  - Summary (if AI-generated)
  - Number of sources and item count
  - Time range of coverage
  - List of related headlines with source links
- **Filters:**
  - Search by keyword (`?q=`)
  - Filter by topic (`?topic=`)
  - Filter by date (`?date=YYYY-MM-DD`)
  - Sort by recent/oldest (`?sort=recent|oldest`)
- **Topic extraction:** Automatically identifies capitalized phrases in headlines (e.g., "Central Bank", "Lagos State")
- Pagination-ready (shows up to 125 events per page)

#### 3. Event Detail (`/events/[id]`)
- Detailed view of a single event
- Shows all related items with full excerpts
- Source attributions with links
- AI summary (if generated)
- **Generate Button:** Allows on-demand AI summary generation

### Components

#### EventsFilters (`src/components/EventsFilters.tsx`)
- Client-side filter UI
- Search input, topic selector, date picker, sort dropdown
- Updates URL query parameters for sharing/bookmarking

#### GenerateButton (`src/components/GenerateButton.tsx`)
- Triggers AI summary generation for an event
- Shows loading state during generation
- Refreshes page after completion

---

## API Endpoints

### 1. `POST /api/ingest`
Manually trigger RSS feed ingestion for all configured feeds.

### 2. `POST /api/group`
Manually trigger event grouping algorithm.

### 3. `POST /api/sources`
Add a new RSS source dynamically (alternative to hardcoding in `feeds.ts`).

**Request Body:**
```json
{
  "name": "Source Name",
  "rssUrl": "https://example.com/feed"
}
```

### 4. `POST /api/feeds/check`
Health check for configured RSS feeds.  
Returns status for each feed (accessible, error, etc.).

### 5. `POST /api/events/[id]/generate`
Generate AI summary for a specific event.

**Query Parameters:**
- `provider` (optional): "ollama" (default) or "huggingface"

---

## CLI Scripts

All scripts use `tsx` for TypeScript execution.

### 1. `npm run ingest`
→ `src/scripts/ingest.ts`  
Fetches and stores items from all configured RSS feeds.

### 2. `npm run group`
→ `src/scripts/group.ts`  
Groups recent items into events using similarity algorithm.

### 3. `npm run generate:event -- <eventId>`
→ `src/scripts/generate-event.ts`  
Generates AI summary for a specific event by ID.

**Example:**
```bash
npm run generate:event -- clxy12345abcde
```

### 4. `npm run worker`
→ `src/scripts/worker.ts`  
Runs continuous background worker (ingest + group on schedule).

---

## Configuration & Environment Variables

### Required (for database)
- *(None - uses Prisma defaults)*

### Optional AI (Ollama - Local)
- `OLLAMA_BASE_URL` (default: http://localhost:11434)
- `OLLAMA_MODEL` (default: llama3.2:latest)
- `OLLAMA_NUM_CTX` (default: 1024)
- `OLLAMA_NUM_PREDICT` (default: 350)
- `OLLAMA_TEMPERATURE` (default: 0.2)
- `OLLAMA_TOP_P` (default: 0.9)
- `OLLAMA_TIMEOUT_MS` (default: 60000)

### Optional AI (HuggingFace - Cloud)
- `HF_API_TOKEN` (required for HuggingFace)
- `HF_TIMEOUT_MS` (default: 120000)

### Groq API (Cloud-Free - Recommended)
- `GROQ_API_KEY` (required for Groq)
- `GROQ_MODEL` (default: llama-3.3-70b-versatile)
- `GROQ_TIMEOUT_MS` (default: 30000)

### Article Extraction (Planned)
- `ENABLE_FULL_TEXT_EXTRACTION` (set to "1" to enable)
- `EXTRACTION_TIMEOUT_MS` (default: 15000)

### Database (Cloud Deployment)
- `DATABASE_URL` (PostgreSQL connection string for Neon/Supabase)
- Example: `postgresql://user:pass@host.region.neon.tech:5432/dbname?sslmode=require`

### Performance Tuning
**RSS Limits:**
- `RSS_MAX_ITEMS_PER_FEED` (default: 40)
- `RSS_EXCERPT_MAX_CHARS` (default: 240)
- `RSS_BODY_MAX_CHARS` (default: 2500)

**Grouping Limits:**
- `GROUP_MAX_ITEMS` (default: 200)
- `GROUP_HOURS_WINDOW` (default: 48)
- `GROUP_SIMILARITY_THRESHOLD` (default: 0.42)

**AI Prompt Limits:**
- `AI_MAX_EVENT_ITEMS` (default: 8)
- `AI_MAX_HEADLINE_CHARS` (default: 140)
- `AI_MAX_EXCERPT_CHARS` (default: 180)

**Worker Limits:**
- `WORKER_INTERVAL_MS` (default: 3600000)
- `WORKER_FEED_DELAY_MS` (default: 250)
- `WORKER_MAX_FEEDS` (default: 0 = all)
- `WORKER_DISABLE_INGEST` (set to "1" to disable)
- `WORKER_DISABLE_GROUP` (set to "1" to disable)

---

## Project Structure

```
/aggregator
├── prisma/                      # Database schema & migrations
│   ├── schema.prisma           # Prisma schema definition
│   └── migrations/             # Database migration history
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Home (redirects to /events)
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   ├── events/
│   │   │   ├── page.tsx       # Events listing
│   │   │   └── [id]/page.tsx  # Event detail
│   │   └── api/               # API routes
│   │       ├── ingest/route.ts
│   │       ├── group/route.ts
│   │       ├── sources/route.ts
│   │       ├── feeds/check/route.ts
│   │       └── events/[id]/generate/route.ts
│   ├── components/            # React components
│   │   ├── EventsFilters.tsx
│   │   └── GenerateButton.tsx
│   ├── lib/                   # Core business logic
│   │   ├── db.ts             # Prisma client instance
│   │   ├── rss.ts            # RSS parsing
│   │   ├── ingest.ts         # Feed ingestion logic
│   │   ├── grouping.ts       # Event grouping algorithm
│   │   ├── text.ts           # Text utilities (tokenization, similarity)
│   │   ├── ollama.ts         # Ollama API client
│   │   ├── huggingface.ts    # HuggingFace API client
│   │   ├── prompt.ts         # AI prompt template
│   │   ├── events.ts         # Event queries/utilities
│   │   └── textExtraction.ts # Text cleaning utilities
│   ├── config/
│   │   └── feeds.ts          # Hardcoded RSS feed list
│   └── scripts/              # CLI utilities
│       ├── ingest.ts         # Manual ingestion
│       ├── group.ts          # Manual grouping
│       ├── generate-event.ts # Manual AI generation
│       ├── worker.ts         # Background worker
│       └── check-items.ts    # Debug utility
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot guidelines
├── package.json              # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── next.config.ts           # Next.js configuration
├── eslint.config.mjs        # ESLint configuration
├── postcss.config.mjs       # PostCSS configuration
└── README.md                # Setup instructions
```

---

## Deployment Setup & Workflow

### Local Development Setup (Current)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   npm run prisma:migrate
   ```
   Creates local PostgreSQL database and applies migrations.

3. **Configure Feeds**
   Edit `src/config/feeds.ts` to add/remove RSS sources.

4. **Optional: Configure Ollama**
   - Install Ollama: https://ollama.ai
   - Pull model: `ollama pull llama3.2:latest`
   - Verify: `ollama list`

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   Runs on http://localhost:3000

### Cloud-Free Production Setup (Planned)

1. **Create Cloud Database**
   
   **Option A: Neon.tech (Recommended)**
   - Sign up at https://neon.tech (GitHub OAuth)
   - Create new project (Free tier: 0.5 GB storage, 1 branch)
   - Copy connection string from dashboard
   - Add to GitHub Secrets as `DATABASE_URL`
   
   **Option B: Supabase**
   - Sign up at https://supabase.com (GitHub OAuth)
   - Create new project (Free tier: 500 MB database, 2 GB bandwidth)
   - Copy connection string from Settings → Database
   - Add to GitHub Secrets as `DATABASE_URL`

2. **Get Groq API Key**
   - Sign up at https://console.groq.com (free)
   - Create API key from dashboard
   - Add to GitHub Secrets as `GROQ_API_KEY`
   - Free tier: 30 req/min, 6,000 tokens/min

3. **Configure GitHub Actions**
   - Create `.github/workflows/cron-ingest.yml`:
   ```yaml
   name: Hourly News Ingestion
   
   on:
     schedule:
       - cron: '0 * * * *'  # Every hour
     workflow_dispatch:  # Manual trigger
   
   jobs:
     ingest:
       runs-on: ubuntu-latest
       env:
         DATABASE_URL: ${{ secrets.DATABASE_URL }}
         GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
       
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
         - run: npm ci
         - run: npm run prisma:generate
         - run: npm run ingest
         - run: npm run group
   ```

4. **Initial Database Migration**
   - Run migrations against cloud database:
   ```bash
   DATABASE_URL="your-neon-or-supabase-url" npm run prisma:migrate deploy
   ```

5. **Verify Setup**
   - Trigger workflow manually from GitHub Actions tab
   - Check run logs for success
   - Verify data in cloud database (Neon/Supabase dashboard)

6. **Deploy Frontend (Optional)**
   - **Vercel:** `npx vercel` (free hobby tier, auto-detects Next.js)
   - **Netlify:** Connect GitHub repo (free tier, serverless functions)
   - **Cloudflare Pages:** Connect GitHub repo (free tier, edge runtime)
   - Set `DATABASE_URL` and `GROQ_API_KEY` in platform environment variables

### Available Tasks (VS Code)

1. **Dev: Next.js**
   - Starts Next.js development server
   - Command: `next dev`
   - Background task

2. **Worker: Ingest hourly**
   - Runs background worker for automated ingestion/grouping
   - Command: `tsx src/scripts/worker.ts`
   - Background task

---

## Current Status & Known Patterns

### ✅ Fully Implemented
- RSS feed ingestion from 9 Nigerian news sources
- Hash-based deduplication
- Time-windowed event grouping with Jaccard similarity
- Database schema with proper relationships and indexes
- Events listing with filters (search, topic, date, sort)
- Event detail pages with full item display
- AI summary generation (Ollama + HuggingFace)
- Structured prompt template with strict output format
- Background worker for automation
- CLI scripts for manual operations
- API endpoints for all core operations
- Responsive UI with Tailwind CSS
- Topic extraction from headlines

### 🔧 Configuration Patterns
- **Environment-driven:** All limits/thresholds configurable via env vars
- **Conservative defaults:** Optimized for laptop performance
- **Fallback logic:** Graceful degradation when AI unavailable
- **Flexible AI:** Supports local (Ollama) and cloud (HuggingFace) providers

### 📊 Performance Considerations
- **Database indexes:** Optimized queries on `sourceId`, `publishedAt`, `eventId`, `itemId`
- **Pagination-ready:** Events listing limited to 125 per page
- **Text truncation:** Excerpts and bodies capped to prevent memory bloat
- **Feed delays:** 250ms between feed fetches to avoid rate limits
- **Timeout handling:** All network requests have configurable timeouts

### 🛡️ Data Integrity
- **Hash-based deduplication:** Same article won't be stored twice
- **Cascade deletes:** Deleting a source removes its items; deleting an event removes its associations
- **Unique constraints:** Prevents duplicate sources, event keys, and item hashes
- **Timestamp tracking:** All records have `createdAt`/`updatedAt`

---

## Key Design Decisions

### 1. **PostgreSQL over SQLite**
- Switched from SQLite (in README) to PostgreSQL
- Better for production deployments
- Uses `@prisma/adapter-pg` for connection pooling

### 2. **Jaccard Similarity for Grouping**
- Simple, explainable algorithm
- No external NLP dependencies
- Works well for headline matching
- Configurable threshold allows tuning

### 3. **Strict AI Prompt Format**
- Ensures consistent, parseable output
- Fields: Event Title, Event Summary, Lenses, Explanation, Coverage Note
- Forces AI to cite sources and acknowledge gaps

### 4. **Stopword Filtering (Nigerian Context)**
- Removes "Nigeria" from comparisons (would match everything)
- Removes common words that don't signal similarity
- Focuses on meaningful content words

### 5. **Time-Window Grouping**
- 48-hour window balances recency vs. over-fragmentation
- Prevents old stories from being grouped with new ones
- Allows late-breaking updates to join existing events

### 6. **No Auto-Generation of AI Summaries**
- AI generation is opt-in (user clicks button)
- Saves compute resources
- Allows users to see raw grouped events first

---

## Next Steps & Potential Enhancements

### Suggested Improvements

**In Progress (Architecture Migration):**
- ✅ **Full-text article extraction:** @extractus/article-extractor for on-demand content
- ✅ **Cloud-free AI:** Groq API replacing local Ollama
- ✅ **Managed database:** Neon.tech or Supabase replacing local Postgres
- ✅ **Automated cron:** GitHub Actions replacing laptop worker

**Future Enhancements:**
- **User authentication:** Allow users to save preferences, mark read items
- **Email/SMS alerts:** Notify users of breaking events
- **Sentiment analysis:** Detect tone variations across sources
- **Geographic tagging:** Identify locations mentioned in headlines
- **Advanced filtering:** By source, by topic category, by item count
- **API rate limiting:** Protect public API endpoints
- **Caching layer:** Redis for frequently accessed events
- **Search improvements:** Full-text search with PostgreSQL's `tsvector`
- **Export functionality:** Download events as PDF/JSON
- **RSS feed for events:** Allow users to subscribe to grouped events

### Performance Optimizations (Not Implemented)
- **Incremental grouping:** Only process new items instead of recomputing all
- **Embeddings-based similarity:** Replace Jaccard with semantic embeddings (e.g., Sentence Transformers)
- **Background job queue:** Use Bull/BullMQ for async processing
- **CDN for static assets:** Improve page load times
- **Database connection pooling:** Better handle concurrent requests

---

## Testing & Debugging

### Manual Testing Workflow
1. Run ingestion: `npm run ingest` or `POST /api/ingest`
2. Check database: `psql` or Prisma Studio
3. Run grouping: `npm run group` or `POST /api/group`
4. View events: Visit http://localhost:3000/events
5. Test AI generation: Click "Generate" button on an event

### Debug Utilities
- **Check Items Script:** `src/scripts/check-items.ts`
  - Lists recent items and their event associations
  - Useful for verifying grouping behavior

### Common Issues
- **No events appearing:** Run grouping after ingestion
- **AI generation fails:** Check Ollama is running (`ollama list`)
- **RSS fetch errors:** Verify feed URLs are accessible
- **Duplicate items:** Hash generation should prevent this; check hash logic

---

## License & Attribution

- **License:** Not specified (private/internal project)
- **RSS Feeds:** Publicly available from Nigerian news outlets
- **AI Models:** 
  - Ollama: Open-source LLM inference (Apache 2.0)
  - HuggingFace: Cloud API with usage limits

---

## Summary

This is a **production-ready MVP** for aggregating Nigerian news with AI-powered neutral summaries, designed for **zero-cost cloud deployment**.

### Current State (Laptop-Bound)
- ✅ **Functional:** All core features work (ingest, group, summarize, display)
- ✅ **Configurable:** Extensive environment variable support
- ✅ **Local-first:** Runs entirely on laptop with local Postgres and Ollama
- ✅ **Transparent:** Always shows original sources and links

### Target State (Cloud-Free Permanent)
- 🎯 **Zero Infrastructure Costs:** Neon/Supabase (database) + Groq (AI) + GitHub Actions (cron) = $0/month
- 🎯 **24/7 Availability:** No laptop required, runs on GitHub's infrastructure
- 🎯 **Enhanced Content:** Full article extraction vs. RSS excerpts
- 🎯 **Faster AI:** Groq API (10-20x faster than local inference)
- 🎯 **Cloud Persistence:** Managed Postgres accessible from anywhere
- 🎯 **Production-Ready:** Scalable, reliable, maintainable

The codebase is clean, well-structured, and follows Next.js/React best practices. The architecture migration to cloud-free deployment maintains all functionality while eliminating infrastructure costs and laptop dependency.
