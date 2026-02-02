# Advanced Features Guide

This document explains the advanced detection and analysis features implemented in the Nigerian News Aggregator.

## Table of Contents
1. [Breaking News Detection](#breaking-news-detection)
2. [Duplicate Source Detection](#duplicate-source-detection)
3. [Enhanced Topic Clustering](#enhanced-topic-clustering)
4. [Timeline View](#timeline-view)
5. [Configuration](#configuration)

---

## Breaking News Detection

### Overview
The system automatically identifies breaking news events based on multiple factors that indicate rapid, widespread coverage of an important story.

### Detection Criteria

The breaking news score is calculated based on three factors:

#### 1. Source Diversity (max 40 points)
- **5+ sources:** 40 points
- **3-4 sources:** 30 points
- **2 sources:** 15 points
- **1 source:** 0 points

#### 2. Article Count (max 30 points)
- **10+ articles:** 30 points
- **5-9 articles:** 20 points
- **3-4 articles:** 10 points
- **<3 articles:** 0 points

#### 3. Time Urgency (max 30 points)
- **Within 1 hour:** 30 points (very urgent)
- **Within 2 hours:** 20 points (urgent)
- **Within 6 hours:** 10 points (moderately urgent)
- **>6 hours:** 0 points

### Breaking News Threshold
**Total Score ≥ 50 = Breaking News** 🔴

### Example Scenarios

**Scenario 1: Breaking News**
- 5 sources publish articles within 1 hour
- Total of 8 articles
- Score: 40 + 20 + 30 = **90 points** ✅ Breaking

**Scenario 2: Not Breaking**
- 2 sources publish articles over 12 hours
- Total of 3 articles
- Score: 15 + 10 + 0 = **25 points** ❌ Not breaking

### Database Schema
```prisma
model Event {
  isBreaking     Boolean  @default(false)  // Is this breaking news?
  breakingScore  Float?                    // Calculated score (0-100)
  // ... other fields
}
```

### Usage

**Run Analysis:**
```bash
npm run analyze
```

**In Code:**
```typescript
import { calculateBreakingScore } from "@/lib/detection";

const score = await calculateBreakingScore(eventId);
// Returns: number (0-100)
// Also updates database with isBreaking flag
```

**UI Indicators:**
- Red badge with 🔴 icon on event cards
- Breaking news count in stats bar
- Score displayed in event detail page

---

## Duplicate Source Detection

### Overview
Sometimes the same news outlet publishes multiple articles about the same event (e.g., initial report + breaking updates + analysis). This feature detects when that happens.

### Detection Method

The system uses **Groq AI** to intelligently determine if multiple articles from the same source are truly about the same event:

1. **Group articles by source**
2. **For sources with multiple articles:**
   - Send titles to Groq API
   - Ask: "Are these about the exact same event?"
   - AI responds with YES/NO
3. **Flag event** if duplicates detected

### Why This Matters
- **Transparency:** Users know when a single source is over-represented
- **Source diversity:** Helps identify events with genuine multi-source coverage
- **Quality control:** Distinguishes between actual corroboration vs. one source's multiple updates

### Example

**Event:** "Nigeria wins AFCON 2024"

**Premium Times Coverage:**
- Article 1: "Nigeria defeats South Africa 2-1 in AFCON final"
- Article 2: "AFCON 2024: How Nigeria secured victory against South Africa"
- Article 3: "President congratulates Super Eagles on AFCON win"

**AI Analysis:** Articles 1 & 2 → YES (same event), Article 3 → NO (different angle)

**Result:** Event flagged with `hasDuplicates: true`

### Database Schema
```prisma
model Event {
  hasDuplicates  Boolean  @default(false)  // Has same-source duplicates?
  // ... other fields
}
```

### Usage

**Run Detection:**
```bash
npm run analyze
```

**In Code:**
```typescript
import { detectDuplicateSources } from "@/lib/detection";

const hasDuplicates = await detectDuplicateSources(eventId);
// Returns: boolean
// Also updates database
```

**UI Indicators:**
- Orange badge with "Duplicate source" label
- Warning message in event detail page

### Configuration
```env
GROQ_API_KEY=your_api_key_here  # Required for AI detection
```

**Fallback:** If Groq API is unavailable, the system conservatively assumes duplicates exist if a source has multiple articles.

---

## Enhanced Topic Clustering

### Overview
Improved topic extraction that understands Nigerian news context and provides better categorization of events.

### Features

#### 1. Heuristic Extraction (No AI Required)
Extracts topics using pattern matching:

**Nigerian Entities Database:**
- Political: Tinubu, Atiku, Peter Obi, APC, PDP, LP, INEC
- Economic: CBN, Naira, Dangote, NNPC, Crude Oil
- Security: Boko Haram, ISWAP, Bandits
- States: Lagos, Abuja, Kano, Rivers, etc.
- Sectors: ASUU, NLC, Fuel Subsidy, Power Sector

**Capitalized Phrase Extraction:**
- Identifies proper nouns in titles
- Builds multi-word phrases (e.g., "National Assembly")
- Filters out generic terms ("Nigeria", "Lagos" alone)

**Hyphenated Terms:**
- Captures compound topics (e.g., "Naira-Dollar", "Israel-Gaza")

#### 2. AI-Enhanced Extraction (Optional)
When enabled, uses Groq AI to extract semantic topics:

```typescript
const topics = await extractTopicsFromText(title, useAI: true);
// Returns: ["Tinubu", "CBN", "Monetary Policy"]
```

#### 3. Topic Similarity Clustering
Groups events by topic overlap using Jaccard similarity:

```typescript
const clusters = clusterEventsByTopic(events, threshold: 0.3);
// Returns: Map<clusterId, eventIds[]>
```

### Example

**Headline:** "Tinubu meets CBN Governor on Naira-Dollar exchange rate crisis"

**Extracted Topics:**
- Tinubu (political entity)
- CBN (economic entity)
- Naira-Dollar (hyphenated term)
- Exchange Rate Crisis (capitalized phrase)

### Usage

**Basic (Heuristic):**
```typescript
import { extractTopicsFromText } from "@/lib/topics";

const topics = await extractTopicsFromText(headline, false);
// Fast, no API calls
```

**Advanced (AI-Enhanced):**
```typescript
const topics = await extractTopicsFromText(headline, true);
// Requires GROQ_API_KEY
```

**Clustering:**
```typescript
import { clusterEventsByTopic } from "@/lib/topics";

const events = [
  { id: "1", topics: ["Tinubu", "CBN", "Economy"] },
  { id: "2", topics: ["Tinubu", "Budget", "Economy"] },
  { id: "3", topics: ["AFCON", "Sports", "Nigeria"] },
];

const clusters = clusterEventsByTopic(events, 0.3);
// Result: 
// Cluster 1: ["1", "2"] (both about Tinubu + Economy)
// Cluster 2: ["3"] (about Sports)
```

### UI Display
- Topic tags on event detail pages
- Color-coded badges (#TopicName)
- Filter events by topic

---

## Timeline View

### Overview
Visual representation of how coverage developed chronologically across different sources.

### Features
- Sorted by published date (oldest first)
- Visual timeline with connecting lines
- Source names and timestamps
- Article headlines preview

### UI Components
- **Timeline dots:** Represent each publication
- **Connecting lines:** Show chronological flow
- **Time labels:** When each article was published
- **Source badges:** Which outlet published

### Implementation
```tsx
// Event detail page automatically sorts items
const sortedItems = [...event.eventItems].sort((a, b) => {
  const dateA = a.item.publishedAt ?? a.item.fetchedAt;
  const dateB = b.item.publishedAt ?? b.item.fetchedAt;
  return dateA.getTime() - dateB.getTime();
});
```

### Use Cases
- **Track breaking news:** See which source broke the story first
- **Identify patterns:** When did coverage accelerate?
- **Source behavior:** Do certain outlets report faster?

---

## Configuration

### Environment Variables

**Required:**
```env
DATABASE_URL=postgresql://...      # Database connection
GROQ_API_KEY=gsk_...              # For AI features
```

**Optional:**
```env
GROQ_MODEL=llama-3.3-70b-versatile  # AI model (default)
GROQ_TIMEOUT_MS=30000               # API timeout

# Feature toggles
ENABLE_BREAKING_DETECTION=true      # Enable breaking news detection
ENABLE_DUPLICATE_DETECTION=true     # Enable duplicate source detection
ENABLE_AI_TOPICS=false              # Enable AI-powered topic extraction
```

### Performance Considerations

**Breaking News Detection:**
- Runs on-demand via `npm run analyze`
- Analyzes last 50 events by default
- Low overhead: database queries only

**Duplicate Source Detection:**
- Requires Groq API call per multi-article source
- Rate limit: 30 requests/minute (free tier)
- Conservative fallback if API unavailable

**Topic Clustering:**
- Heuristic extraction: ~1ms per headline (fast)
- AI extraction: ~200ms per headline (slower, optional)
- Recommendation: Use heuristic for real-time, AI for batch processing

---

## Best Practices

### 1. Run Analysis Regularly
```bash
# Add to cron or GitHub Actions
0 * * * * npm run analyze  # Every hour
```

### 2. Monitor Breaking News
- Check stats bar for breaking count
- Set up alerts for high scores (70+)
- Review breaking events manually for accuracy

### 3. Manage Duplicates
- Investigate sources with high duplicate rates
- Consider adjusting RSS feed selection
- Use as quality signal (not necessarily bad)

### 4. Optimize Topics
- Review extracted topics regularly
- Add domain-specific entities to heuristic database
- Use AI extraction for ambiguous cases

### 5. Analyze Timeline Patterns
- Identify fastest-responding sources
- Track coverage gaps (hours without updates)
- Detect coordinated reporting patterns

---

## Troubleshooting

### Breaking News Not Detected
**Possible causes:**
- Events have < 3 sources (threshold not met)
- Time window > 6 hours (too slow for breaking)
- Not enough articles (< 3 items)

**Solution:** Adjust thresholds in `src/lib/detection.ts`

### Duplicate Detection Failures
**Possible causes:**
- Groq API key missing/invalid
- Rate limit exceeded (30/min)
- Network issues

**Solution:** 
- Check `GROQ_API_KEY` in `.env`
- Add retry logic with exponential backoff
- Falls back to conservative detection

### Topic Extraction Misses Entities
**Possible causes:**
- Entity not in heuristic database
- Title doesn't use standard capitalization
- Complex phrasing

**Solution:**
- Add entities to `src/lib/topics.ts`
- Enable AI extraction for better results
- Review and manually tag

### Timeline Out of Order
**Possible causes:**
- Missing `publishedAt` dates
- RSS feed timestamp issues
- Clock skew between sources

**Solution:**
- Check feed quality with `POST /api/feeds/check`
- Falls back to `fetchedAt` if `publishedAt` missing
- Consider time zone normalization

---

## API Reference

### `calculateBreakingScore(eventId: string)`
Calculate breaking news score for an event.

**Returns:** `Promise<number>` (0-100)

**Side effects:** Updates `Event.isBreaking` and `Event.breakingScore` in database

### `detectDuplicateSources(eventId: string)`
Detect if event has duplicate coverage from same source.

**Returns:** `Promise<boolean>`

**Side effects:** Updates `Event.hasDuplicates` in database

### `analyzeRecentEvents(limit?: number)`
Analyze multiple events for breaking news and duplicates.

**Parameters:**
- `limit` (optional): Number of events to analyze (default: 20)

**Returns:**
```typescript
Promise<{
  analyzed: number;
  breaking: number;
  duplicates: number;
}>
```

### `extractTopicsFromText(text: string, useAI?: boolean)`
Extract topics from headline text.

**Parameters:**
- `text`: Headline or text to analyze
- `useAI`: Enable AI extraction (default: false)

**Returns:** `Promise<string[]>` (max 5 topics)

### `clusterEventsByTopic(events, threshold?: number)`
Group events by topic similarity.

**Parameters:**
- `events`: Array of `{ id: string, topics: string[] }`
- `threshold`: Jaccard similarity threshold (default: 0.3)

**Returns:** `Map<string, string[]>` (cluster ID → event IDs)

---

## Future Enhancements

### Planned Features
- [ ] User-configurable breaking news thresholds
- [ ] Email/SMS alerts for breaking news
- [ ] Topic-based event feeds (RSS)
- [ ] Sentiment analysis per source
- [ ] Geographic tagging (extract locations)
- [ ] Source credibility scoring
- [ ] Real-time WebSocket updates for breaking news
- [ ] Machine learning for better topic clustering

### Experimental
- [ ] Graph-based event relationships
- [ ] Automated fact-checking integration
- [ ] Multi-language support (Hausa, Yoruba, Igbo)
- [ ] Video/podcast aggregation
- [ ] Social media sentiment tracking

---

## Contributing

To add new detection features:

1. **Update schema:** Add fields to `prisma/schema.prisma`
2. **Create migration:** `npm run prisma:migrate`
3. **Implement detection:** Add logic to `src/lib/detection.ts`
4. **Add UI indicators:** Update components in `src/components/`
5. **Document:** Add section to this guide
6. **Test:** Write tests and run analysis

---

## License

See main project [README.md](../README.md) for license information.
