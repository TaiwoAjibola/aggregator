# Setting Up Groq API (Free Tier)

Groq provides ultra-fast LLM inference with a generous free tier. Perfect for the cloud-free architecture!

## Why Groq?

- ✅ **Free Tier**: 30 requests/minute, 6,000 tokens/minute (enough for hourly news aggregation)
- ✅ **Ultra Fast**: 10-20x faster than local Ollama on a laptop
- ✅ **High Quality**: Access to llama-3.3-70b-versatile (70B parameter model)
- ✅ **No Credit Card**: Free tier requires only email signup
- ✅ **Reliable**: Production-ready infrastructure

## Getting Your Free API Key

1. **Sign Up**
   - Go to https://console.groq.com
   - Click "Sign In" (top right)
   - Sign up with your email or GitHub account (no credit card required)

2. **Create API Key**
   - After logging in, you'll see the dashboard
   - Click "API Keys" in the left sidebar
   - Click "Create API Key"
   - Give it a name (e.g., "News Aggregator")
   - Copy the key immediately (you won't see it again!)

3. **Add to Your .env File**
   ```bash
   GROQ_API_KEY=gsk_your_actual_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

4. **Test It**
   ```bash
   # Run ingestion and grouping first
   npm run ingest
   npm run group
   
   # Then test AI generation on an event
   npm run generate:event -- <event-id>
   ```

## Available Models

| Model | Speed | Quality | Context | Best For |
|-------|-------|---------|---------|----------|
| `llama-3.3-70b-versatile` | Fast | Excellent | 128K tokens | **Recommended** - Best balance |
| `llama-3.1-8b-instant` | Ultra Fast | Good | 128K tokens | High-volume, simple tasks |
| `mixtral-8x7b-32768` | Fast | Excellent | 32K tokens | Alternative to llama-3.3 |
| `gemma2-9b-it` | Fast | Good | 8K tokens | Lightweight tasks |

## Rate Limits (Free Tier)

- **Requests**: 30 per minute
- **Tokens**: 6,000 per minute
- **Context**: Up to 128K tokens (depending on model)

For hourly news aggregation (recommended workflow):
- 9 feeds × 40 items = 360 items/hour
- ~10-20 events/hour
- Each event summary uses ~1 request
- **Well within free tier limits!** ✅

## Troubleshooting

### Error: "Invalid GROQ_API_KEY"
- Check that you copied the full key (starts with `gsk_`)
- Make sure there are no extra spaces
- Verify the key wasn't revoked in the Groq console

### Error: "Rate limit exceeded"
- Free tier: 30 requests/minute
- Wait 60 seconds and retry
- Consider reducing `WORKER_MAX_FEEDS` or increasing `WORKER_INTERVAL_MS`

### Error: "Model not found"
- Check model name spelling
- Verify model is available: https://console.groq.com/docs/models
- Default recommended: `llama-3.3-70b-versatile`

## Fallback Behavior

If Groq fails (network issue, rate limit, etc.), the system automatically falls back to:
1. **Local Ollama** (if running)
2. **Error message** (if no fallback available)

This ensures your app keeps working even if Groq is temporarily unavailable!

## Monitoring Usage

- Dashboard: https://console.groq.com
- Check "Usage" tab to see:
  - Requests per day
  - Tokens consumed
  - Rate limit status
  - Cost (should be $0 on free tier)

## Upgrading (Optional)

If you need more than the free tier:
- **Pay-as-you-go**: $0.05 - $0.27 per million tokens (very affordable)
- **No monthly fees**: Only pay for what you use
- See pricing: https://groq.com/pricing/

For this news aggregator, **free tier is sufficient** for personal use!

---

**Next Step**: Once you have your API key, add it to `.env` and test with:
```bash
npm run ingest && npm run group && npm run dev
```

Then visit an event page and click "Generate" to see Groq in action! 🚀
