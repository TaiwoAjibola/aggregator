import { extract } from "@extractus/article-extractor";

export type ExtractedArticle = {
  title?: string;
  content?: string;
  author?: string;
  published?: string;
  image?: string;
  source?: string;
  description?: string;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Extract full article content from a URL
 * On-demand extraction - only called when viewing article details
 */
export async function extractArticleContent(url: string): Promise<ExtractedArticle | null> {
  if (!url) return null;

  const timeoutMs = envInt("EXTRACTION_TIMEOUT_MS", 15000);

  try {
    const article = await extract(url, {}, {
      timeout: timeoutMs,
    });

    if (!article) return null;

    return {
      title: article.title || undefined,
      content: article.content || undefined,
      author: article.author || undefined,
      published: article.published || undefined,
      image: article.image || undefined,
      source: article.source || undefined,
      description: article.description || undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Article extraction failed for ${url}: ${message}`);
    return null;
  }
}

/**
 * Extract and cache article content in database
 */
export async function getOrExtractArticleContent(
  itemId: string,
  url: string,
  currentBody: string | null,
): Promise<string | null> {
  // If we already have full content, return it
  if (currentBody && currentBody.length > 500) {
    return currentBody;
  }

  // Extract from URL
  const extracted = await extractArticleContent(url);
  if (!extracted?.content) return currentBody;

  // Return extracted content (caller should save to DB if needed)
  return extracted.content;
}
