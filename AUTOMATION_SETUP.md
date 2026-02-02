# GitHub Actions Automation Setup Guide

Your news aggregator will now run automatically every 30 minutes using GitHub Actions - completely free, no laptop required!

## Quick Setup (5 minutes)

### 1. Add Secrets to GitHub Repository

Go to your GitHub repository: https://github.com/TaiwoAjibola/aggregator

1. Click **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

**DATABASE_URL:**
```
your_neon_database_connection_string_here
```

**GROQ_API_KEY:**
```
your_groq_api_key_here
```

> **Note:** Use the actual values from your `.env` file (don't commit `.env` to GitHub!)
> - Get DATABASE_URL from Neon.tech dashboard
> - Get GROQ_API_KEY from console.groq.com

### 2. Enable GitHub Actions

1. Go to the **Actions** tab in your repository
2. If prompted, click **"I understand my workflows, go ahead and enable them"**
3. You should see "Automated News Aggregation" workflow

### 3. Test Manual Run (Optional)

1. Click on **"Automated News Aggregation"** workflow
2. Click **"Run workflow"** dropdown
3. Click green **"Run workflow"** button
4. Wait ~2-3 minutes, then click on the running workflow to see logs

### 4. Monitor Automatic Runs

The workflow runs automatically every 30 minutes:
- Check **Actions** tab to see run history
- Click on any run to see detailed logs
- Each run shows: ingest results, grouping stats, analysis results

## What Happens Every 30 Minutes

```
┌─────────────────────────────────────────┐
│  GitHub Actions Triggers (cron)         │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  1. Ingest RSS Feeds                    │
│     - Fetches from 9 Nigerian sources   │
│     - Creates new Item records          │
│     - Deduplicates by hash              │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  2. Group into Events                   │
│     - Uses Jaccard similarity           │
│     - 48-hour time window               │
│     - Creates Event records             │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  3. Analyze Events                      │
│     - Breaking news detection           │
│     - Duplicate source detection (AI)   │
│     - Updates Event flags               │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Frontend (Vercel) Shows Updated Data   │
│     - New articles grouped              │
│     - Breaking news badges              │
│     - Timeline views                    │
└─────────────────────────────────────────┘
```

## Customizing the Schedule

Edit `.github/workflows/aggregate.yml` to change frequency:

**Every 30 minutes (current):**
```yaml
schedule:
  - cron: '*/30 * * * *'
```

**Every hour:**
```yaml
schedule:
  - cron: '0 * * * *'
```

**Every 15 minutes:**
```yaml
schedule:
  - cron: '*/15 * * * *'
```

**Every 2 hours:**
```yaml
schedule:
  - cron: '0 */2 * * *'
```

## Viewing Logs

Example log output from successful run:

```json
{
  "ok": true,
  "startedAt": "2026-02-02T18:30:00.000Z",
  "finishedAt": "2026-02-02T18:32:15.000Z",
  "ingest": [
    { "source": "Premium Times", "created": 12, "skipped": 3 },
    { "source": "Punch", "created": 18, "skipped": 7 },
    ...
  ],
  "group": {
    "ok": true,
    "createdEvents": 15,
    "linkedItems": 45
  },
  "analyze": {
    "analyzed": 50,
    "breaking": 2,
    "duplicates": 3
  }
}
```

## Cost Analysis

**GitHub Actions Free Tier:**
- 2,000 minutes/month for public repos (UNLIMITED for public repos actually!)
- Your workflow takes ~2-3 minutes per run
- Running every 30 minutes = 48 runs/day = ~120 minutes/day
- Still well within free limits

**Total Monthly Cost: $0.00** ✅

## Troubleshooting

### Workflow Not Running
- Check if Actions are enabled (Settings → Actions → General)
- Verify secrets are added correctly
- Check workflow file syntax in `.github/workflows/aggregate.yml`

### Workflow Failing
- Click on failed run to see error logs
- Common issues:
  - Invalid DATABASE_URL (check Neon.tech connection string)
  - Invalid GROQ_API_KEY (verify at console.groq.com)
  - Database connection timeout (Neon might be sleeping, will retry)

### Analysis Not Detecting Breaking News
- Breaking news requires:
  - 3+ sources covering the same event
  - Coverage within 1-2 hours
  - Multiple articles (5+)
- Check `analyze` section in logs to see results

### Rate Limiting
- Groq free tier: 30 requests/minute
- Analysis checks ~50 events per run
- If you hit limits, reduce `ANALYZE_EVENT_LIMIT` to 30

## Advanced Configuration

Add these environment variables to the workflow if needed:

```yaml
env:
  # Limit analysis scope
  ANALYZE_EVENT_LIMIT: 30  # Default: 50
  
  # Disable specific steps
  WORKER_DISABLE_INGEST: '0'
  WORKER_DISABLE_GROUP: '0'
  WORKER_DISABLE_ANALYZE: '0'
  
  # RSS limits
  RSS_MAX_ITEMS_PER_FEED: 40
  
  # Grouping
  GROUP_MAX_ITEMS: 200
  GROUP_HOURS_WINDOW: 48
```

## Monitoring Best Practices

1. **Check Actions tab daily** - Review for any failures
2. **Monitor Groq usage** - Log in to console.groq.com to check API usage
3. **Watch Neon DB** - Check database size at neon.tech (free tier: 0.5 GB)
4. **Review breaking news** - Manually verify breaking news detections are accurate

## Switching Back to Local

If you want to run locally instead:

```bash
# Run worker once
npm run worker

# Or set up cron on your laptop (macOS/Linux)
crontab -e

# Add this line (runs every 30 minutes)
*/30 * * * * cd /Users/ajibola/aggregator && npm run worker
```

## Next Steps

Once automation is working:

1. ✅ Monitor first few runs to ensure everything works
2. ✅ Check your Vercel frontend for new content
3. ✅ Review breaking news detections for accuracy
4. ✅ Adjust cron schedule if needed (more/less frequent)
5. ✅ Consider adding more news sources to `src/config/feeds.ts`

---

## Status Check

Run this to verify everything is configured:

```bash
# Check if workflow file exists
ls -la .github/workflows/aggregate.yml

# Check if secrets are needed (don't commit .env to GitHub!)
echo "DATABASE_URL=$DATABASE_URL" | head -c 50
echo "GROQ_API_KEY=$GROQ_API_KEY" | head -c 20
```

**Important:** The GitHub Actions workflow uses secrets from GitHub, NOT your local `.env` file!

---

Your automation is now live! 🚀

Visit your frontend at Vercel and within 30 minutes you should see new content automatically aggregated, grouped, and analyzed.
