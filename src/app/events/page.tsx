import Link from "next/link";
import type { Prisma } from "@prisma/client";

import EventsFilters from "@/components/EventsFilters";
import StatsBar from "@/components/StatsBar";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventsSearchParams = {
  // Back-compat: `topic` was the old name for `kind`.
  topic?: string;
  kind?: string;
  type?: "politics" | "economics" | "business" | "other";
  sort?: "recent" | "oldest";
  date?: string;
  q?: string;
};

type EventType = "Politics" | "Economics" | "Business" | "Other";

function parseAiField(
  outputText: string,
  field: "Event Title" | "Event Summary" | "Explanation" | "Coverage Note",
): string | null {
  const lines = outputText.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m = line.match(new RegExp(String.raw`^${field}:\s*(.*)$`));
    if (!m) continue;
    const inline = (m[1] ?? "").trim();
    if (inline) return inline;

    // Multi-line form: header line then value on the next non-empty line.
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j].trim();
      if (!next) continue;
      // Stop if we hit another header.
      if (/^(Event Title|Event Summary|Lenses|Explanation|Coverage Note):\s*/.test(next)) return null;
      return next;
    }
    return null;
  }

  return null;
}

function truncate(text: string, maxChars: number): string {
  const value = text.trim();
  if (value.length <= maxChars) return value;
  return value.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

function extractTopicsFromTitle(title: string): string[] {
  const cleaned = title
    .replace(/[“”"'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  const words = cleaned.split(" ").slice(0, 12);
  const topics: string[] = [];

  const isConnector = (w: string) => /^(of|and|the|in|on|for|to|vs|v)$/.test(w.toLowerCase());
  const isTopicWord = (w: string) => /^[A-Z][\w-]*$/.test(w) || /^[A-Z]{2,}[\w-]*$/.test(w);

  let i = 0;
  while (i < words.length) {
    const w = words[i] ?? "";
    if (!isTopicWord(w)) {
      i += 1;
      continue;
    }

    const phrase: string[] = [w];
    let j = i + 1;
    while (j < words.length) {
      const next = words[j] ?? "";
      if (isTopicWord(next) || (isConnector(next) && isTopicWord(words[j + 1] ?? ""))) {
        phrase.push(next);
        j += 1;
        continue;
      }
      break;
    }

    const joined = phrase
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Drop very generic leading words.
    const normalized = joined.replace(/^(Nigeria|Nigerian)\s+/, "").trim();
    if (normalized.length >= 3 && normalized.length <= 40) topics.push(normalized);

    i = j;
  }

  // Also treat the first hyphenated proper token as a topic (e.g., Israel-Gaza).
  const hyphen = cleaned.match(/\b[A-Z][\w]*-[A-Z][\w-]*\b/);
  if (hyphen?.[0]) topics.unshift(hyphen[0]);

  // Deduplicate while preserving order.
  return Array.from(new Set(topics)).slice(0, 4);
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return fmt.format(start);

  const left = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start);
  const right = fmt.format(end);
  return `${left}–${right}`;
}

function parseYyyyMmDd(value: string | undefined): { dayStartUtc: number; dayEndUtc: number } | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const dayStartUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const dayEndUtc = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  return { dayStartUtc, dayEndUtc };
}

function inferEventType(input: { title: string; summary: string; topics: string[] }): EventType {
  const text = `${input.title}\n${input.summary}\n${input.topics.join(" ")}`.toLowerCase();

  const score = (needles: string[]) => needles.reduce((acc, n) => (text.includes(n) ? acc + 1 : acc), 0);

  const politics = score([
    "election",
    "inec",
    "apc",
    "pdp",
    "lp",
    "nnpp",
    "senate",
    "national assembly",
    "house of representatives",
    "governor",
    "president",
    "minister",
    "policy",
    "bill",
    "committee",
    "campaign",
    "primaries",
  ]);

  const economics = score([
    "inflation",
    "cpi",
    "gdp",
    "recession",
    "economy",
    "economic",
    "naira",
    "forex",
    "fx",
    "exchange rate",
    "interest rate",
    "cbn",
    "budget",
    "debt",
    "imf",
    "world bank",
    "tariff",
    "trade",
    "oil price",
    "crude",
  ]);

  const business = score([
    "business",
    "company",
    "firm",
    "bank",
    "investor",
    "investors",
    "market",
    "stock",
    "shares",
    "earnings",
    "profit",
    "revenue",
    "ceo",
    "acquisition",
    "merger",
    "ipo",
    "startup",
    "dangote",
    "nse",
    "ngx",
  ]);

  const best: Array<[EventType, number]> = [
    ["Politics", politics],
    ["Economics", economics],
    ["Business", business],
  ];

  const top = best.reduce((acc, cur) => (cur[1] > acc[1] ? cur : acc), ["Other" as EventType, 0]);
  return top[1] > 0 ? top[0] : "Other";
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: EventsSearchParams;
}) {
  try {
    const params = await searchParams;
    const selectedKind = (params?.kind ?? params?.topic ?? "All").trim() || "All";
    const selectedTypeParam = (params?.type ?? "").trim();
    const selectedType: EventType | "All" =
      selectedTypeParam === "politics"
        ? "Politics"
        : selectedTypeParam === "economics"
          ? "Economics"
          : selectedTypeParam === "business"
            ? "Business"
            : selectedTypeParam === "other"
              ? "Other"
              : "All";
    const sort = params?.sort === "oldest" ? "oldest" : "recent";
    const selectedDate = (params?.date ?? "").trim() || "";
    const query = (params?.q ?? "").trim();
    const selectedDay = parseYyyyMmDd(selectedDate);

    const where = (() => {
      const and: Prisma.EventWhereInput[] = [];

      if (selectedDay) {
        const { dayStartUtc, dayEndUtc } = selectedDay;
        const dayStart = new Date(dayStartUtc);
        const dayEnd = new Date(dayEndUtc);

        // Match the page's fallback window logic:
        // windowStart = startAt ?? createdAt
        // windowEnd = endAt ?? updatedAt
        and.push({
          OR: [
            {
              AND: [
                { startAt: { not: null } },
                { endAt: { not: null } },
                { startAt: { lte: dayEnd } },
                { endAt: { gte: dayStart } },
              ],
            },
            {
              AND: [
                { startAt: { not: null } },
                { endAt: null },
                { startAt: { lte: dayEnd } },
                { updatedAt: { gte: dayStart } },
              ],
            },
            {
              AND: [
                { startAt: null },
                { endAt: { not: null } },
                { createdAt: { lte: dayEnd } },
                { endAt: { gte: dayStart } },
              ],
            },
            {
              AND: [
                { startAt: null },
                { endAt: null },
                { createdAt: { lte: dayEnd } },
                { updatedAt: { gte: dayStart } },
              ],
            },
          ],
        });
      }

      if (query) {
        and.push({
          OR: [
            {
              aiOutputs: {
                some: {
                  outputText: { contains: query, mode: "insensitive" },
                },
              },
            },
            {
              eventItems: {
                some: {
                  item: {
                    OR: [
                      { title: { contains: query, mode: "insensitive" } },
                      { excerpt: { contains: query, mode: "insensitive" } },
                      { source: { name: { contains: query, mode: "insensitive" } } },
                    ],
                  },
                },
              },
            },
          ],
        });
      }

      return and.length ? ({ AND: and } satisfies Prisma.EventWhereInput) : undefined;
    })();

    const events = await db().event.findMany({
      where,
      orderBy: { updatedAt: sort === "oldest" ? "asc" : "desc" },
      take: 100,
      include: {
        _count: { select: { eventItems: true, aiOutputs: true } },
        aiOutputs: { orderBy: { createdAt: "desc" }, take: 1 },
        eventItems: {
          orderBy: { createdAt: "asc" },
          take: 8,
          include: { item: { include: { source: true } } },
        },
      },
    });

  const topicCounts = new Map<string, number>();
  const eventTopicsById = new Map<string, string[]>();

  type Row = {
    id: string;
    title: string;
    summary: string;
    sources: string[];
    hasAi: boolean;
    limitedCoverage: boolean;
    coverageNote: string | null;
    start: Date;
    end: Date;
    topics: string[];
    itemsCount: number;
    sourcesCount: number;
    isBreaking: boolean;
    hasDuplicates: boolean;
    breakingScore: number | null;
    eventType: EventType;
  };

  const rows: Row[] = [];

  for (const e of events) {
    const outputText = e.aiOutputs[0]?.outputText ?? null;
    const titleFromAi = outputText ? parseAiField(outputText, "Event Title") : null;
    const summaryFromAi = outputText ? parseAiField(outputText, "Event Summary") : null;
    const coverageNoteFromAi = outputText ? parseAiField(outputText, "Coverage Note") : null;

    const fallbackTitle = e.eventItems[0]?.item.title ?? e.id.slice(0, 10) + "…";
    const fallbackSummary = e.eventItems[0]?.item.excerpt ?? "";
    const title = titleFromAi ?? truncate(fallbackTitle, 90);
    const summary = truncate(summaryFromAi ?? fallbackSummary, 180);
    const sources = Array.from(new Set(e.eventItems.map((ei) => ei.item.source.name)));
    const limitedCoverage = sources.length < 2;
    const hasAi = e._count.aiOutputs > 0;
    const start = e.startAt ?? e.createdAt;
    const end = e.endAt ?? e.updatedAt;
    const topics = extractTopicsFromTitle(titleFromAi ?? fallbackTitle);
    const eventType = inferEventType({ title, summary, topics });

    eventTopicsById.set(e.id, topics);
    for (const t of topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);

    rows.push({
      id: e.id,
      title,
      summary,
      sources,
      hasAi,
      limitedCoverage,
      coverageNote:
        limitedCoverage
          ? (coverageNoteFromAi ??
              "This event is currently reported by a limited number of sources. Coverage may expand as more reports emerge.")
          : null,
      start,
      end,
      topics,
      itemsCount: e._count.eventItems,
      sourcesCount: sources.length,
      isBreaking: e.isBreaking,
      hasDuplicates: e.hasDuplicates,
      breakingScore: e.breakingScore,
      eventType,
    });
  }

  const dynamicTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t)
    .slice(0, 10);

  const kindsForChips = ["All", ...dynamicTopics];
  if (selectedKind !== "All" && !kindsForChips.includes(selectedKind)) {
    kindsForChips.splice(1, 0, selectedKind);
  }

  const typeChips: Array<{ label: EventType | "All"; value: "" | "politics" | "economics" | "business" | "other" }> = [
    { label: "All", value: "" },
    { label: "Politics", value: "politics" },
    { label: "Economics", value: "economics" },
    { label: "Business", value: "business" },
    { label: "Other", value: "other" },
  ];

  const filteredRows = rows
    .filter((r) => (selectedKind === "All" ? true : r.topics.includes(selectedKind)))
    .filter((r) => (selectedType === "All" ? true : r.eventType === selectedType));

  // Calculate stats
  const allSources = new Set<string>();
  let totalItems = 0;
  let breakingCount = 0;
  
  for (const r of rows) {
    for (const s of r.sources) allSources.add(s);
    totalItems += r.itemsCount;
    if (r.isBreaking) breakingCount++;
  }

  return (
    <div className="grid gap-6 md:gap-8">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Events</h1>
          <p className="max-w-2xl text-xs md:text-sm text-zinc-600 dark:text-zinc-400">
            Grouped clusters of similar headlines (48-hour window).
          </p>
        </div>

        <StatsBar 
          totalEvents={rows.length} 
          totalItems={totalItems} 
          uniqueSources={allSources.size}
          breakingCount={breakingCount}
        />

        <EventsFilters
          kinds={kindsForChips}
          selectedKind={selectedKind}
          eventTypes={typeChips}
          selectedType={selectedType}
          sort={sort}
          date={selectedDate}
          q={query}
        />
      </div>

      <div className="grid gap-3 md:gap-4">
        {filteredRows.map((r) => {
          return (
            <Link
              key={r.id}
              href={`/events/${r.id}`}
              className="group relative cursor-pointer rounded-lg md:rounded-2xl border border-zinc-200 bg-white p-3 md:p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
            >
              <div className="flex flex-col md:flex-row items-start justify-between gap-2 md:gap-4">
                <div className="min-w-0 flex-1">
                  {r.isBreaking && (
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800 dark:bg-red-500/20 dark:text-red-200">
                      🔴 BREAKING NEWS
                    </div>
                  )}
                  <div className="text-base md:text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50 line-clamp-2 md:line-clamp-none">
                    {r.title}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1 md:gap-2">
                  {r.limitedCoverage ? (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800 dark:bg-sky-500/15 dark:text-sky-200">
                      <span className="text-sky-700 dark:text-sky-200">●</span>
                      Limited coverage
                    </span>
                  ) : null}
                  {r.hasDuplicates ? (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800 dark:bg-orange-500/15 dark:text-orange-200">
                      <span className="text-orange-700 dark:text-orange-200">●</span>
                      Duplicate source
                    </span>
                  ) : null}
                </div>
              </div>

              {r.summary ? (
                <div className="mt-2 md:mt-3 max-w-4xl text-xs md:text-[13px] leading-relaxed text-zinc-700 line-clamp-2 dark:text-zinc-300">
                  {r.summary}
                </div>
              ) : null}

              {r.limitedCoverage ? (
                <div className="mt-2 md:mt-3 text-xs text-zinc-600 dark:text-zinc-400">{r.coverageNote}</div>
              ) : null}

              <div className="mt-3 md:mt-4 flex flex-wrap items-center gap-1 md:gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="tabular-nums">{r.itemsCount} report{r.itemsCount === 1 ? "" : "s"}</span>
                <span className="hidden xs:inline">•</span>
                <span className="tabular-nums hidden xs:inline">{r.sourcesCount} source{r.sourcesCount === 1 ? "" : "s"}</span>
                <span className="hidden xs:inline">•</span>
                <span className="hidden xs:inline">{formatDateRange(r.start, r.end)}</span>
              </div>

              {r.sources.length > 0 ? (
                <div className="mt-3 md:mt-4 flex flex-wrap gap-1 md:gap-2">
                  {r.sources.slice(0, 5).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-white/20 dark:hover:bg-white/10"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="pointer-events-none absolute right-5 top-5 text-zinc-500 opacity-0 transition group-hover:opacity-100 dark:text-zinc-400">
                <span className="inline-block translate-x-0 transition group-hover:translate-x-0.5">→</span>
              </div>
            </Link>
          );
        })}

        {filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
            No events yet.
          </div>
        ) : null}
      </div>
    </div>
    );
  } catch (error) {
    console.error("EventsPage error:", error);
    return (
      <div className="min-h-screen bg-white dark:bg-[#0E0E0E]">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm dark:border-red-900/30 dark:bg-red-900/10">
            <p className="font-semibold text-red-900 dark:text-red-200">Error loading events</p>
            <p className="mt-2 text-red-800 dark:text-red-300">
              {error instanceof Error ? error.message : "Unknown error occurred"}
            </p>
            {process.env.NODE_ENV === "development" && (
              <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs text-red-900 dark:bg-red-900/30 dark:text-red-200">
                {error instanceof Error ? error.stack : String(error)}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }
}
