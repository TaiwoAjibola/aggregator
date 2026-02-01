/**
 * Smart text extraction for event details
 * - Header: Title only (no summarization)
 * - Body: Full article content with source attribution
 * - Metadata: Coverage details
 */

/**
 * Extract header - article title
 * Goal: Clear, direct headline
 */
export function extractHeader(title: string): string {
  return title;
}

/**
 * Extract body - full article content as-is
 * No truncation, preserve full text for credibility
 */
export function extractBody(body?: string, excerpt?: string): string {
  // Prefer full body, fall back to excerpt
  return (body || excerpt || "").trim();
}

/**
 * Format article with full content and source attribution
 */
export interface ArticleDisplay {
  title: string;
  body: string;
  sourceName: string;
  sourceUrl?: string;
  publishedAt: Date;
}

export function formatArticleWithAttribution(article: ArticleDisplay): {
  body: string;
  attribution: string;
} {
  const attribution = `
Source: ${article.sourceName}
${article.sourceUrl ? `Read more: ${article.sourceUrl}` : ""}
Published: ${article.publishedAt.toLocaleString("en-NG")}
`;

  return {
    body: article.body,
    attribution: attribution.trim(),
  };
}
