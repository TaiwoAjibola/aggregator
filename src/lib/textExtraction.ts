/**
 * Smart text extraction for event summaries
 * - Header: First 1-2 sentences (punchy intro)
 * - Body: First 3-4 paragraphs (2-minute read)
 */

function extractSentences(text: string, count: number): string {
  if (!text) return "";
  
  // Split by sentence boundaries (., !, ?)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  return sentences
    .slice(0, count)
    .join(" ")
    .trim();
}

function extractParagraphs(text: string, count: number = 3): string {
  if (!text) return "";
  
  // Split by multiple newlines or assume sentences as paragraphs
  const paragraphs = text
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .slice(0, count)
    .map(p => p.trim());
  
  // If we don't have enough paragraph breaks, split by sentences
  if (paragraphs.length < count) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    let currentPara = "";
    const result = [];
    
    for (const sentence of sentences) {
      currentPara += sentence;
      // Assume 3-4 sentences per paragraph
      if (currentPara.split(/[.!?]+/).length > 3) {
        result.push(currentPara.trim());
        currentPara = "";
        if (result.length >= count) break;
      }
    }
    if (currentPara.trim()) result.push(currentPara.trim());
    
    return result.join("\n\n");
  }
  
  return paragraphs.join("\n\n");
}

/**
 * Extract header - first 1-2 sentences (40-80 chars typically)
 * Goal: Punchy, attention-grabbing intro
 */
export function extractHeader(title: string, excerpt: string, body?: string): string {
  // Use title as primary header - it's already optimized for this
  return title;
}

/**
 * Extract body - first 3-4 paragraphs (~1500 chars, 2-minute read)
 * Goal: Substantial summary without being overwhelming
 */
export function extractBody(
  excerpts: string[],
  bodies: string[]
): string {
  // Prioritize: combine bodies first, then excerpts
  const allContent = [
    ...bodies.filter(Boolean),
    ...excerpts.filter(Boolean),
  ].join(" ");
  
  if (!allContent) return "";
  
  // Extract substantial body - roughly 1500 chars
  const substantial = extractParagraphs(allContent, 4);
  
  // Truncate to ~1500 chars at sentence boundary for readability
  let result = substantial;
  if (result.length > 1500) {
    result = result.slice(0, 1500);
    const lastPeriod = result.lastIndexOf(".");
    if (lastPeriod > 1000) {
      result = result.slice(0, lastPeriod + 1);
    }
  }
  
  return result;
}

/**
 * Extract subheader - first 1-2 sentences from excerpt
 * Goal: Quick context/intro to the body
 */
export function extractSubheader(
  excerpts: string[],
  bodies: string[]
): string {
  const firstExcerpt = excerpts[0] || bodies[0];
  if (!firstExcerpt) return "";
  
  return extractSentences(firstExcerpt, 2);
}
