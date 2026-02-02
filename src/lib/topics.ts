import { groqGenerate } from "./groq";

/**
 * Enhanced topic extraction using AI and heuristics
 */
export async function extractTopicsFromText(
  text: string,
  useAI = false
): Promise<string[]> {
  // Heuristic extraction (fast, no API calls)
  const heuristicTopics = extractTopicsHeuristic(text);

  // Optionally use AI for better extraction
  if (useAI && process.env.GROQ_API_KEY) {
    try {
      const aiTopics = await extractTopicsWithAI(text);
      // Merge and deduplicate
      return Array.from(new Set([...aiTopics, ...heuristicTopics])).slice(0, 5);
    } catch (err) {
      console.warn("AI topic extraction failed, using heuristic:", err);
      return heuristicTopics;
    }
  }

  return heuristicTopics;
}

/**
 * Heuristic-based topic extraction (no AI required)
 * Improved version with better Nigerian context
 */
function extractTopicsHeuristic(text: string): string[] {
  const cleaned = text
    .replace(/["""'']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  
  if (!cleaned) return [];

  const topics: string[] = [];

  // Common Nigerian entities and topics
  const nigerianEntities = [
    // Political
    "Tinubu", "Atiku", "Peter Obi", "INEC", "APC", "PDP", "LP", "NNPP",
    "National Assembly", "Senate", "House of Representatives", "Buhari",
    // Economic
    "CBN", "Naira", "Dollar", "Dangote", "NNPC", "Crude Oil",
    // Security
    "Boko Haram", "ISWAP", "Bandits", "Kidnappers", "Police", "Army",
    // States
    "Lagos", "Abuja", "Kano", "Rivers", "Kaduna", "Oyo", "Delta",
    // Sectors
    "ASUU", "NLC", "TUC", "Fuel Subsidy", "Power Sector", "PHCN",
  ];

  // Check for known entities
  for (const entity of nigerianEntities) {
    const regex = new RegExp(`\\b${entity}\\b`, "i");
    if (regex.test(cleaned)) {
      topics.push(entity);
    }
  }

  // Extract capitalized phrases (proper nouns)
  const words = cleaned.split(" ");
  const isConnector = (w: string) => 
    /^(of|and|the|in|on|for|to|vs|v|at|by|with)$/i.test(w);
  const isTopicWord = (w: string) => 
    /^[A-Z][\w-]*$/.test(w) || /^[A-Z]{2,}[\w-]*$/.test(w);

  let i = 0;
  while (i < words.length && topics.length < 10) {
    const w = words[i] ?? "";
    if (!isTopicWord(w)) {
      i++;
      continue;
    }

    const phrase: string[] = [w];
    let j = i + 1;
    
    // Build multi-word phrases
    while (j < words.length && phrase.length < 4) {
      const next = words[j] ?? "";
      if (isTopicWord(next) || (isConnector(next) && isTopicWord(words[j + 1] ?? ""))) {
        phrase.push(next);
        j++;
      } else {
        break;
      }
    }

    const joined = phrase.join(" ").trim();
    
    // Filter out generic terms
    const isGeneric = /^(Nigeria|Nigerian|Lagos|Abuja|The|A|An|This|That)$/i.test(joined);
    if (!isGeneric && joined.length >= 3 && joined.length <= 50) {
      topics.push(joined);
    }

    i = j;
  }

  // Extract hyphenated terms (e.g., Israel-Gaza, Naira-Dollar)
  const hyphenated = cleaned.match(/\b[A-Z][\w]*-[A-Z][\w-]*\b/g) ?? [];
  topics.push(...hyphenated);

  // Deduplicate and limit
  return Array.from(new Set(topics)).slice(0, 5);
}

/**
 * Use Groq AI to extract relevant topics from text
 */
async function extractTopicsWithAI(text: string): Promise<string[]> {
  const prompt = `Extract 3-5 key topics or entities from this Nigerian news headline. Return only the topics, one per line, no explanations:

"${text}"

Topics:`;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return [];

  const response = await groqGenerate(prompt, { apiKey });
  
  // Parse response (one topic per line)
  const topics = response
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length > 0 && line.length < 50)
    .slice(0, 5);

  return topics;
}

/**
 * Calculate topic similarity for clustering
 */
export function calculateTopicSimilarity(topics1: string[], topics2: string[]): number {
  if (topics1.length === 0 || topics2.length === 0) return 0;

  const set1 = new Set(topics1.map((t) => t.toLowerCase()));
  const set2 = new Set(topics2.map((t) => t.toLowerCase()));

  const intersection = new Set([...set1].filter((t) => set2.has(t)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Cluster events by topic similarity
 */
export function clusterEventsByTopic(
  events: Array<{ id: string; topics: string[] }>,
  threshold = 0.3
): Map<string, string[]> {
  const clusters = new Map<string, string[]>();

  for (const event of events) {
    let assigned = false;

    // Try to find existing cluster
    for (const [clusterId, eventIds] of clusters.entries()) {
      const clusterEvent = events.find((e) => e.id === clusterId);
      if (!clusterEvent) continue;

      const similarity = calculateTopicSimilarity(event.topics, clusterEvent.topics);
      if (similarity >= threshold) {
        eventIds.push(event.id);
        assigned = true;
        break;
      }
    }

    // Create new cluster if no match
    if (!assigned) {
      clusters.set(event.id, [event.id]);
    }
  }

  return clusters;
}
