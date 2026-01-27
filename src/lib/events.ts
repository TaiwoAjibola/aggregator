import { db } from "@/lib/db";
import { buildNeutralAggregationPrompt, PROMPT_VERSION } from "@/lib/prompt";
import { ollamaGenerate } from "@/lib/ollama";

const DEFAULT_COVERAGE_NOTE =
  "This event is currently reported by a limited number of sources. Coverage may expand as more reports emerge.";

type LensName =
  | "Policy / Official Statements"
  | "Economic Impact"
  | "Public Reaction / Social Impact"
  | "Regional or Community Focus"
  | "Investigative / Accountability Focus"
  | "Straight Reporting";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function truncate(text: string | null | undefined, maxChars: number): string {
  const value = (text ?? "").trim();
  if (!value) return "";
  return value.length <= maxChars ? value : value.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

function hasHeader(outputText: string, header: string): boolean {
  const re = new RegExp(String.raw`^${header}:\s*`, "m");
  return re.test(outputText);
}

function extractSection(outputText: string, header: string, aliases: string[] = []): string | null {
  const headers = [header, ...aliases];
  const lines = outputText.split(/\r?\n/);

  const isHeaderLine = (line: string) => {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) return null;
    const name = m[1].trim();
    const value = m[2] ?? "";
    if (!headers.includes(name)) return null;
    return { name, value };
  };

  let start = -1;
  let inlineValue = "";
  for (let i = 0; i < lines.length; i += 1) {
    const m = isHeaderLine(lines[i]);
    if (!m) continue;
    start = i;
    inlineValue = m.value.trim();
    break;
  }
  if (start === -1) return null;

  if (inlineValue) return inlineValue;

  // Collect subsequent non-header lines until the next header.
  const headerRe = /^(Event Title|Event Summary|Neutral Event Summary|Lenses|Explanation|Coverage Note):\s*/;
  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (headerRe.test(line)) break;
    collected.push(line);
  }

  const value = collected.join("\n").trim();
  return value || null;
}

function normalizeLensesSection(
  outputText: string,
  fallback?: {
    source: string;
    lens: LensName;
  },
): string {
  const lines = outputText.split(/\r?\n/);
  const lensesIndex = lines.findIndex((l) => l.trim() === "Lenses:");
  if (lensesIndex === -1) return outputText;

  const headerRe = /^(Event Title|Event Summary|Lenses|Explanation|Coverage Note):\s*/;
  let endIndex = lines.length;
  for (let i = lensesIndex + 1; i < lines.length; i += 1) {
    if (headerRe.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  const before = lines.slice(0, lensesIndex + 1);
  const section = lines.slice(lensesIndex + 1, endIndex);
  const after = lines.slice(endIndex);

  type LensGroup = { header: string; sources: string[] };
  const groups: LensGroup[] = [];
  const seenSources = new Set<string>();
  let current: LensGroup | null = null;

  for (const rawLine of section) {
    const line = rawLine.replace(/\s+$/g, "");
    if (!line.trim()) continue;

    const lensHeaderMatch = line.match(/^\-\s+(.+):\s*$/);
    if (lensHeaderMatch) {
      if (current) groups.push(current);
      current = { header: lensHeaderMatch[1].trim(), sources: [] };
      continue;
    }

    const sourceMatch = line.match(/^\s{2,}\-\s+(.+)$/);
    if (sourceMatch && current) {
      const source = sourceMatch[1].trim();
      if (!source) continue;
      if (seenSources.has(source)) continue;
      seenSources.add(source);
      current.sources.push(source);
    }
  }
  if (current) groups.push(current);

  const nonEmpty = groups.filter((g) => g.sources.length > 0);
  const rendered: string[] = [];

  if (nonEmpty.length === 0 && fallback?.source) {
    rendered.push(`- ${fallback.lens}:`);
    rendered.push(`  - ${fallback.source}`);
  } else {
    for (const g of nonEmpty) {
      rendered.push(`- ${g.header}:`);
      for (const s of g.sources) rendered.push(`  - ${s}`);
      rendered.push("");
    }
    if (rendered[rendered.length - 1] === "") rendered.pop();
  }

  return [...before, ...rendered, ...after].join("\n").trim();
}

function inferLensForSingleSource(inputItems: Array<{ headline: string; excerpt: string }>): LensName {
  const text = inputItems
    .map((it) => `${it.headline} ${it.excerpt}`)
    .join(" ")
    .toLowerCase();

  const score = (keywords: string[]) => keywords.reduce((acc, k) => (text.includes(k) ? acc + 1 : acc), 0);

  const policy = score([
    "said",
    "statement",
    "announced",
    "according",
    "attributed",
    "blamed",
    "explained",
    "minister",
    "government",
    "agency",
    "commission",
    "operator",
    "spokesperson",
    "niso",
  ]);
  const economic = score([
    "price",
    "market",
    "inflation",
    "naira",
    "economy",
    "economic",
    "business",
    "investors",
    "trade",
    "tariff",
  ]);
  const investigative = score(["investigation", "probe", "audit", "corruption", "fraud", "accountability"]);
  const publicReaction = score(["protest", "outrage", "anger", "residents", "students", "citizens", "social media"]);
  const regional = score(["state", "community", "local", "lagos", "abuja", "kano", "rivers", "kaduna", "enugu"]);

  // Tie-breaker precedence: Policy > Economic > Investigative > Public Reaction > Regional > Straight
  const pairs: Array<[LensName, number]> = [
    ["Policy / Official Statements", policy],
    ["Economic Impact", economic],
    ["Investigative / Accountability Focus", investigative],
    ["Public Reaction / Social Impact", publicReaction],
    ["Regional or Community Focus", regional],
  ];

  const best = pairs.reduce((acc, cur) => (cur[1] > acc[1] ? cur : acc), ["Straight Reporting" as LensName, 0]);
  return best[1] > 0 ? best[0] : "Straight Reporting";
}

function ensureExplanation(outputText: string, uniqueSources: string[]): string {
  if (hasHeader(outputText, "Explanation")) return outputText;
  const suffix =
    uniqueSources.length < 2
      ? "This report reflects the emphasis of a single available source."
      : "This report groups sources by what they emphasize most when describing the event.";
  return `${outputText.trim()}\n\nExplanation:\n${suffix}`;
}

function ensureCoverageNote(outputText: string, uniqueSources: string[]): string {
  if (uniqueSources.length >= 2) return outputText;
  if (hasHeader(outputText, "Coverage Note")) return outputText;
  return `${outputText.trim()}\n\nCoverage Note:\n${DEFAULT_COVERAGE_NOTE}`;
}

function canonicalizeOutput(outputText: string, uniqueSources: string[], inferredSingleSourceLens?: LensName): string {
  const title =
    extractSection(outputText, "Event Title") ??
    extractSection(outputText, "Title") ??
    "(missing)";

  const summary =
    extractSection(outputText, "Event Summary", ["Neutral Event Summary"]) ??
    "(missing)";

  let lensesBlock = extractSection(outputText, "Lenses") ?? "";

  // Rebuild a temporary text that has an explicit Lenses section so normalizeLensesSection can work.
  const normalizedLensesText = normalizeLensesSection(`Lenses:\n${lensesBlock}`,
    uniqueSources.length < 2 && uniqueSources[0] && inferredSingleSourceLens
      ? { source: uniqueSources[0], lens: inferredSingleSourceLens }
      : uniqueSources[0]
        ? { source: uniqueSources[0], lens: "Straight Reporting" }
        : undefined,
  );
  lensesBlock = extractSection(normalizedLensesText, "Lenses") ?? "";

  const fallbackExplanation = (() => {
    if (uniqueSources.length < 2) {
      if (inferredSingleSourceLens === "Policy / Official Statements") {
        return "This report focuses on the official explanation emphasized in the available coverage.";
      }
      if (inferredSingleSourceLens === "Economic Impact") {
        return "This report focuses on economic implications emphasized in the available coverage.";
      }
      return "This report reflects the emphasis of a single available source.";
    }
    return "This report groups sources by what they emphasize most when describing the event.";
  })();

  const explanation = extractSection(outputText, "Explanation") ?? fallbackExplanation;

  const includeCoverage = uniqueSources.length < 2;
  const coverage = includeCoverage ? DEFAULT_COVERAGE_NOTE : null;

  const parts: string[] = [
    "Event Title:",
    title.trim(),
    "",
    "Event Summary:",
    summary.trim(),
    "",
    "Lenses:",
    lensesBlock.trim() || (uniqueSources[0] ? `- Straight Reporting:\n  - ${uniqueSources[0]}` : "(missing)"),
    "",
    "Explanation:",
    explanation.trim(),
  ];

  if (includeCoverage && coverage) {
    parts.push("", "Coverage Note:", coverage);
  }

  return parts.join("\n").trim();
}

export async function getEventWithItems(eventId: string) {
  return db().event.findUnique({
    where: { id: eventId },
    include: {
      eventItems: {
        include: { item: { include: { source: true } } },
        orderBy: { createdAt: "asc" },
      },
      aiOutputs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}

export async function generateEventSummaryWithOllama(eventId: string) {
  // Prefer a smaller model by default for local laptops.
  // Override via OLLAMA_MODEL.
  const model = process.env.OLLAMA_MODEL ?? "llama3.2:latest";
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  if (process.env.AI_DISABLED === "1") {
    throw new Error("AI is disabled (AI_DISABLED=1)");
  }

  const event = await getEventWithItems(eventId);
  if (!event) throw new Error("Event not found");

  const maxItems = envInt("AI_MAX_EVENT_ITEMS", 12);
  const maxHeadlineChars = envInt("AI_MAX_HEADLINE_CHARS", 180);
  const maxExcerptChars = envInt("AI_MAX_EXCERPT_CHARS", 220);

  const eventItems = event.eventItems;
  const sliced = maxItems > 0 && eventItems.length > maxItems ? eventItems.slice(-maxItems) : eventItems;

  const inputItems = sliced.map((ei) => ({
    sourceName: truncate(ei.item.source.name, 80),
    headline: truncate(ei.item.title, maxHeadlineChars),
    excerpt: truncate(ei.item.excerpt, maxExcerptChars),
    timestamp: (ei.item.publishedAt ?? ei.item.fetchedAt).toISOString(),
  }));

  const uniqueSources = Array.from(new Set(inputItems.map((it) => it.sourceName).filter(Boolean)));
  const inferredSingleSourceLens: LensName | undefined =
    uniqueSources.length < 2
      ? inferLensForSingleSource(
          inputItems.map((it) => ({ headline: it.headline, excerpt: it.excerpt ?? "" })),
        )
      : undefined;

  const prompt = buildNeutralAggregationPrompt(inputItems);

  let outputText = await ollamaGenerate(prompt, {
    baseUrl,
    model,
    timeoutMs: envInt("OLLAMA_TIMEOUT_MS", 60_000),
    options: {
      num_ctx: envInt("OLLAMA_NUM_CTX", 1024),
      num_predict: envInt("OLLAMA_NUM_PREDICT", 350),
      temperature: envFloat("OLLAMA_TEMPERATURE", 0.2),
      top_p: envFloat("OLLAMA_TOP_P", 0.9),
    },
  });

  outputText = normalizeLensesSection(
    outputText,
    uniqueSources.length < 2 && uniqueSources[0] && inferredSingleSourceLens
      ? { source: uniqueSources[0], lens: inferredSingleSourceLens }
      : undefined,
  );
  outputText = ensureExplanation(outputText, uniqueSources);
  outputText = ensureCoverageNote(outputText, uniqueSources);
  outputText = canonicalizeOutput(outputText, uniqueSources, inferredSingleSourceLens);

  const saved = await db().eventAiOutput.create({
    data: {
      eventId: event.id,
      model,
      promptVersion: PROMPT_VERSION,
      outputText,
    },
  });

  return saved;
}
