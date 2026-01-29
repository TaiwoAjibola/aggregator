import Parser from "rss-parser";

export type ParsedFeedItem = {
  title: string;
  url?: string;
  publishedAt?: Date;
  excerpt?: string;
  body?: string;
};

const parser: Parser = new Parser({
  timeout: 15_000,
});

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stripCmsNoise(value: string): string {
  // Remove common WordPress / newsletter boilerplate that pollutes excerpts.
  // Keep this intentionally small and conservative.
  return value
    .replace(/\bThe post\b[^.]*\bappeared first on\b[^.]*\.?/gi, " ")
    .replace(/\bappeared first on\b[^.]*\.?/gi, " ")
    .replace(/\bRead more\b\s*$/gi, " ")
    .replace(/\bContinue reading\b\s*$/gi, " ")
    .replace(/\bSubscribe\b[^.]*\.?/gi, " ")
    .replace(/\bShare this\b[^.]*\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBody(item: Parser.Item): string | undefined {
  const anyItem = item as unknown as Record<string, unknown>;
  const raw =
    (typeof item.content === "string" ? item.content : undefined) ??
    (typeof anyItem["content:encoded"] === "string"
      ? (anyItem["content:encoded"] as string)
      : undefined) ??
    (typeof (item as unknown as { description?: unknown }).description === "string"
      ? ((item as unknown as { description?: string }).description as string)
      : undefined) ??
    item.contentSnippet ??
    (typeof item.summary === "string" ? item.summary : undefined);
  if (!raw) return undefined;
  const maxChars = envInt("RSS_BODY_MAX_CHARS", 1200);
  const cleaned = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const withoutNoise = stripCmsNoise(cleaned);
  return withoutNoise.slice(0, maxChars);
}

function pickExcerpt(item: Parser.Item): string | undefined {
  const anyItem = item as unknown as Record<string, unknown>;
  const raw =
    item.contentSnippet ??
    (typeof item.content === "string" ? item.content : undefined) ??
    (typeof (item as unknown as { description?: unknown }).description === "string"
      ? ((item as unknown as { description?: string }).description as string)
      : undefined) ??
    (typeof item.summary === "string" ? item.summary : undefined) ??
    (typeof anyItem["description"] === "string" ? (anyItem["description"] as string) : undefined) ??
    (typeof anyItem["content:encoded"] === "string"
      ? (anyItem["content:encoded"] as string)
      : undefined);
  if (!raw) return undefined;
  const maxChars = envInt("RSS_EXCERPT_MAX_CHARS", 240);
  const cleaned = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const withoutNoise = stripCmsNoise(cleaned);
  return withoutNoise.slice(0, maxChars);
}

export async function fetchRssItems(rssUrl: string): Promise<ParsedFeedItem[]> {
  const feed = await parser.parseURL(rssUrl);
  const items: ParsedFeedItem[] = [];

  const maxItems = envInt("RSS_MAX_ITEMS_PER_FEED", 40);
  const feedItems = (feed.items ?? []).slice(0, Math.max(0, maxItems));

  for (const item of feedItems) {
    const title = (item.title ?? "").trim();
    if (!title) continue;

    const url = item.link?.trim() || undefined;
    const iso = item.isoDate?.trim();
    const publishedAt = iso ? new Date(iso) : undefined;

    items.push({
      title,
      url,
      publishedAt,
      excerpt: pickExcerpt(item),
      body: pickBody(item),
    });
  }

  return items;
}
