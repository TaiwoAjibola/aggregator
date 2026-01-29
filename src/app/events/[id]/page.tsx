import Link from "next/link";

import { getEventWithItems } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDateShort(value: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(value);
}

function formatDateTimeShort(value: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatReadableSummary(text: string, maxChars: number = 1500): string {
  // Truncate at sentence boundary for better readability
  let truncated = text.slice(0, maxChars);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastQuestion = truncated.lastIndexOf("?");
  const lastEnd = Math.max(lastPeriod, lastQuestion);
  
  if (lastEnd > maxChars * 0.7) {
    truncated = truncated.slice(0, lastEnd + 1);
  }
  
  return truncated;
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventWithItems(id);

  if (!event) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-zinc-600">Event not found.</div>
      </div>
    );
  }

  const latestOutput = event.aiOutputs[0]?.outputText ?? null;
  const sources = Array.from(new Set(event.eventItems.map((ei) => ei.item.source.name)));
  const limitedCoverage = sources.length < 2;
  const lastRefreshedAt = event.aiOutputs[0]?.createdAt ?? null;

  const windowStart = event.startAt ?? event.createdAt;
  const windowEnd = event.endAt ?? event.updatedAt;
  const windowLabel =
    windowStart.toDateString() === windowEnd.toDateString()
      ? `Coverage window: ${formatDateShort(windowStart)}`
      : `Coverage window: ${formatDateShort(windowStart)} – ${formatDateShort(windowEnd)}`;

  const heroTitle = event.eventItems[0]?.item.title ?? "Event";
  const heroSummary = event.eventItems[0]?.item.excerpt ?? "";
  const heroUrl = event.eventItems[0]?.item.url ?? "";
  
  // Combine body content from top 3 articles for substantial header information
  const combinedBody = event.eventItems
    .slice(0, 3)
    .map((ei) => ei.item.body || ei.item.excerpt)
    .filter(Boolean)
    .join(" ");
  
  const substantialBody = formatReadableSummary(combinedBody, 1500);

  return (
    <div className="grid gap-4 md:gap-6">
      {/* Header Section */}
      <section className="rounded-lg md:rounded-2xl border border-zinc-200 bg-white p-4 md:p-8 shadow-sm">
        <Link href="/events" className="mb-4 inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900">
          ← Back to events
        </Link>
        
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 break-words mt-2">{heroTitle}</h1>
        
        {(substantialBody || heroSummary) && (
          <div className="mt-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 md:p-5 border border-blue-200">
            <p className="text-sm md:text-base text-zinc-800 leading-relaxed whitespace-pre-wrap">
              {substantialBody || heroSummary}
            </p>
            {heroUrl && (
              <a
                href={heroUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline transition"
              >
                Read full report
                <span className="text-base">→</span>
              </a>
            )}
          </div>
        )}
        {heroSummary && (
          <p className="mt-3 text-sm md:text-base text-zinc-700 leading-relaxed max-w-3xl">{heroSummary}</p>
        )}
        
        <div className="mt-4 flex flex-col xs:flex-row xs:flex-wrap items-start xs:items-center gap-2 xs:gap-3 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1">
            <span className="text-zinc-500">📅</span>
            {windowLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1">
            <span className="text-zinc-500">📰</span>
            {sources.length} source{sources.length !== 1 ? "s" : ""}
          </span>
          {limitedCoverage && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-amber-800">
              <span>⚠</span>
              Early coverage
            </span>
          )}
        </div>
      </section>

      {/* Sources Section */}
      <section className="rounded-lg md:rounded-2xl border border-zinc-200 bg-white p-4 md:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Coverage by Source ({event.eventItems.length} articles)</h2>
        
        <div className="mt-4 grid gap-3 md:gap-4">
          {event.eventItems.map((ei) => (
            <div key={ei.id} className="border border-zinc-200 rounded-lg p-3 md:p-4 hover:border-zinc-300 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm md:text-base text-zinc-900 break-words line-clamp-2 md:line-clamp-none">
                    {ei.item.title}
                  </h3>
                  {ei.item.excerpt && (
                    <p className="mt-2 text-xs md:text-sm text-zinc-600 line-clamp-2 md:line-clamp-none">
                      {ei.item.excerpt}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700">
                  {ei.item.source.name}
                </span>
                <span className="text-zinc-500 whitespace-nowrap">
                  {formatDateTimeShort(ei.item.publishedAt ?? ei.item.fetchedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sources List */}
      {sources.length > 0 && (
        <section className="rounded-lg md:rounded-2xl border border-zinc-200 bg-white p-4 md:p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">All Sources in This Event</h2>
          
          <div className="mt-4 flex flex-wrap gap-2">
            {sources.map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 font-medium"
              >
                <span className="text-base">🔗</span>
                {source}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
