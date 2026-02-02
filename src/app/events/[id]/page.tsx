import Link from "next/link";

import { getEventWithItems } from "@/lib/events";
import { extractHeader } from "@/lib/textExtraction";
import ExtractArticleButton from "@/components/ExtractArticleButton";

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

  const sources = Array.from(new Set(event.eventItems.map((ei) => ei.item.source.name)));
  const limitedCoverage = sources.length < 2;

  const windowStart = event.startAt ?? event.createdAt;
  const windowEnd = event.endAt ?? event.updatedAt;
  const windowLabel =
    windowStart.toDateString() === windowEnd.toDateString()
      ? `${formatDateShort(windowStart)}`
      : `${formatDateShort(windowStart)} – ${formatDateShort(windowEnd)}`;

  const heroTitle = event.eventItems[0]?.item.title ?? "Event";
  const headerTitle = extractHeader(heroTitle);

  return (
    <div className="grid gap-8 md:gap-10">
      {/* HEADER SECTION - Main Focus */}
      <section className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-6 md:p-8 shadow-md">
        <Link href="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 font-medium">
          ← Back to events
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 break-words mt-3 leading-tight">
          {headerTitle}
        </h1>
      </section>

      {/* FULL ARTICLE BODIES WITH ATTRIBUTION */}
      {event.eventItems.map((ei, index) => (
        <section key={ei.id} className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Source Header */}
          <div className="bg-gradient-to-r from-zinc-50 to-zinc-100 border-b border-zinc-200 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">{ei.item.source.name}</h2>
                <p className="text-xs md:text-sm text-zinc-600 mt-1">
                  {formatDateTimeShort(ei.item.publishedAt ?? ei.item.fetchedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Article Title */}
          <div className="border-b border-zinc-200 p-4 md:p-5 bg-white">
            <h3 className="text-xl md:text-2xl font-bold text-zinc-900 leading-tight">
              {ei.item.title}
            </h3>
          </div>

          {/* Article Body - Full Content or Excerpt */}
          <div className="p-6 md:p-8 text-base md:text-lg text-zinc-800 leading-relaxed whitespace-pre-wrap">
            {ei.item.body && (
              ei.item.body
            )}
            {!ei.item.body && ei.item.excerpt && (
              <div>
                <p className="text-sm text-blue-600 mb-3 italic">📝 Excerpt (full article available at source)</p>
                {ei.item.excerpt}
                {ei.item.url && (
                  <ExtractArticleButton 
                    itemId={ei.item.id} 
                    itemTitle={ei.item.title}
                    hasBody={false}
                  />
                )}
              </div>
            )}
            {!ei.item.body && !ei.item.excerpt && (
              <p className="text-zinc-600 italic">No content available for this article.</p>
            )}
          </div>

          {/* Article Footer - Source Credit and Link */}
          <div className="border-t border-zinc-200 bg-zinc-50 p-4 md:p-5">
            <div className="text-xs text-zinc-600 space-y-2">
              <p className="font-medium">Source: <span className="font-semibold text-zinc-900">{ei.item.source.name}</span></p>
              {ei.item.url && (
                <p>
                  Original article:{" "}
                  <a 
                    href={ei.item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    {ei.item.url}
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Divider between articles */}
          {index < event.eventItems.length - 1 && (
            <div className="h-8 bg-gradient-to-b from-zinc-100 to-white flex items-center justify-center">
              <div className="text-zinc-400 text-sm">↓</div>
            </div>
          )}
        </section>
      ))}

      {/* METADATA SECTION - Event Details */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 md:p-6 shadow-sm">
        <h3 className="text-sm uppercase tracking-widest font-semibold text-zinc-500 mb-4">Event Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Coverage Window</p>
              <p className="text-sm font-medium text-zinc-900">{windowLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📰</span>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Sources</p>
              <p className="text-sm font-medium text-zinc-900">{sources.length} outlet{sources.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📄</span>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Articles</p>
              <p className="text-sm font-medium text-zinc-900">{event.eventItems.length} report{event.eventItems.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        
        {limitedCoverage && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xl">⚠️</span>
            <p className="text-sm text-amber-900">Early coverage - only {sources.length} source{sources.length !== 1 ? "s" : ""} reporting</p>
          </div>
        )}
      </section>

      {/* ALL SOURCES LIST - Reference */}
      {sources.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 md:p-6 shadow-sm">
          <h3 className="text-sm uppercase tracking-widest font-semibold text-zinc-500 mb-4">All Sources in This Event</h3>
          
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
