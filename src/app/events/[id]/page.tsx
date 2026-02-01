import Link from "next/link";

import { getEventWithItems } from "@/lib/events";
import { extractHeader, extractBody, extractSubheader } from "@/lib/textExtraction";

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

// Format large body text with paragraph breaks for readability
function formatBodyParagraphs(text: string): string {
  return text
    .split("\n\n")
    .filter(p => p.trim())
    .join("\n\n");
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
      ? `Coverage window: ${formatDateShort(windowStart)}`
      : `Coverage window: ${formatDateShort(windowStart)} – ${formatDateShort(windowEnd)}`;

  const heroTitle = event.eventItems[0]?.item.title ?? "Event";
  const heroUrl = event.eventItems[0]?.item.url ?? "";
  
  // Extract header, subheader, and body using smart text extraction
  const excerpts = event.eventItems.slice(0, 3).map(ei => ei.item.excerpt).filter(Boolean) as string[];
  const bodies = event.eventItems.slice(0, 3).map(ei => ei.item.body).filter(Boolean) as string[];
  
  const headerTitle = extractHeader(heroTitle, excerpts[0] || "", bodies[0]);
  const subheader = extractSubheader(excerpts, bodies);
  const eventBody = extractBody(excerpts, bodies);

  return (
    <div className="grid gap-6 md:gap-8">
      {/* HEADER SECTION - Main Focus */}
      <section className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-6 md:p-8 shadow-md">
        <Link href="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 font-medium">
          ← Back to events
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 break-words mt-3 leading-tight">
          {headerTitle}
        </h1>
        
        {subheader && (
          <p className="mt-4 text-lg text-zinc-700 leading-relaxed max-w-4xl font-medium italic">
            {subheader}
          </p>
        )}
      </section>

      {/* BODY SECTION - Main Content */}
      {eventBody && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-sm uppercase tracking-widest font-semibold text-zinc-500 mb-4">Full Summary</h2>
          <div className="prose prose-sm max-w-none">
            <p className="text-base md:text-lg text-zinc-800 leading-relaxed whitespace-pre-wrap">
              {formatBodyParagraphs(eventBody)}
            </p>
          </div>
          
          {heroUrl && (
            <a
              href={heroUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-900 hover:underline transition"
            >
              Read original report
              <span className="text-lg">→</span>
            </a>
          )}
        </section>
      )}

      {/* METADATA SECTION - Secondary Info */}
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

      {/* COVERAGE BY SOURCE - Detailed Articles */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 md:p-6 shadow-sm">
        <h3 className="text-sm uppercase tracking-widest font-semibold text-zinc-500 mb-4">Coverage by Source ({event.eventItems.length} articles)</h3>
        
        <div className="mt-4 grid gap-3 md:gap-4">
          {event.eventItems.map((ei) => (
            <a
              key={ei.id}
              href={ei.item.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-zinc-200 rounded-lg p-3 md:p-4 hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm md:text-base text-zinc-900 break-words line-clamp-2 md:line-clamp-none hover:text-blue-700">
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
            </a>
          ))}
        </div>
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
