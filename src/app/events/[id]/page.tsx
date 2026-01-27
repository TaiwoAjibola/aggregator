import Link from "next/link";

import { GenerateButton } from "@/components/GenerateButton";
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

function parseSingleLineField(
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

    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j].trim();
      if (!next) continue;
      if (/^(Event Title|Event Summary|Lenses|Explanation|Coverage Note):\s*/.test(next)) return null;
      return next;
    }
    return null;
  }

  return null;
}

function parseBlock(outputText: string, header: "Lenses"): string | null {
  const lines = outputText.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `${header}:`);
  if (start === -1) return null;

  const headerRe = /^(Event Title|Event Summary|Lenses|Explanation|Coverage Note):\s*/;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (headerRe.test(lines[i])) {
      end = i;
      break;
    }
  }

  const block = lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
  return block || null;
}

type LensGroup = {
  lens: string;
  sources: string[];
};

function parseLensesBlock(lensesBlock: string | null): LensGroup[] {
  if (!lensesBlock) return [];
  const lines = lensesBlock.split(/\r?\n/);
  const groups: LensGroup[] = [];
  let current: LensGroup | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    if (!line.trim()) continue;

    const headerMatch = line.match(/^\-\s+(.+):\s*$/);
    if (headerMatch) {
      if (current) groups.push(current);
      current = { lens: headerMatch[1].trim(), sources: [] };
      continue;
    }

    const sourceMatch = line.match(/^\s{2,}\-\s+(.+)$/);
    if (sourceMatch && current) {
      const source = sourceMatch[1].trim();
      if (!source) continue;
      current.sources.push(source);
    }
  }

  if (current) groups.push(current);
  return groups.filter((g) => g.lens && g.sources.length > 0);
}

function lensBadgeTone(lens: string): string {
  switch (lens) {
    case "Policy / Official Statements":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "Economic Impact":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Public Reaction / Social Impact":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "Investigative / Accountability Focus":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "Regional or Community Focus":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-900";
  }
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

  const aiTitle = latestOutput ? parseSingleLineField(latestOutput, "Event Title") : null;
  const aiSummary = latestOutput ? parseSingleLineField(latestOutput, "Event Summary") : null;
  const aiExplanation = latestOutput ? parseSingleLineField(latestOutput, "Explanation") : null;
  const aiCoverage = latestOutput ? parseSingleLineField(latestOutput, "Coverage Note") : null;
  const aiLenses = latestOutput ? parseBlock(latestOutput, "Lenses") : null;

  const heroTitle = aiTitle ?? event.eventItems[0]?.item.title ?? "Event";
  const heroSummary = aiSummary ?? event.eventItems[0]?.item.excerpt ?? "";
  const lenses = parseLensesBlock(aiLenses);
  const explanationText =
    aiExplanation ??
    (limitedCoverage
      ? "This event is currently summarized based on available reports."
      : "This page groups multiple reports about the same event to show how different sources emphasize different aspects.");

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{heroTitle}</h1>
            {heroSummary ? <div className="mt-2 text-sm text-zinc-700">{heroSummary}</div> : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <span>{windowLabel}</span>
              <span>•</span>
              <span>{limitedCoverage ? "Early coverage" : "Multi-source coverage"}</span>
              <span>•</span>
              <span>
                Sources: {sources.length}
                {sources.length > 0 ? ` (${sources.slice(0, 3).join(", ")}${sources.length > 3 ? "…" : ""})` : ""}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <GenerateButton eventId={event.id} />
            <div className="mt-2 text-xs text-zinc-500">
              Last refreshed: {lastRefreshedAt ? formatDateTimeShort(lastRefreshedAt) : "Not yet"}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          This page groups multiple reports about the same event to show how different sources emphasize different aspects.
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-zinc-900">Summary & source grouping</div>
            <div className="mt-1 text-xs text-zinc-500">Generated using a local AI model (Ollama) from the same source data.</div>
          </div>
          <div className="text-xs text-zinc-500">Latest update: {formatDateTimeShort(event.aiOutputs[0]?.createdAt ?? new Date())}</div>
        </div>

        {latestOutput ? (
          <div className="mt-4 grid gap-4">
            <div>
              <div className="text-xs font-medium text-zinc-500">Lenses</div>
              {lenses.length > 0 ? (
                <div className="mt-3 grid gap-3">
                  {lenses.map((g) => (
                    <div key={g.lens} className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${lensBadgeTone(
                            g.lens,
                          )}`}
                        >
                          {g.lens}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {g.sources.map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-zinc-700">No lens grouping available yet.</div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500">Explanation</div>
              <div className="mt-1 text-sm text-zinc-700">{explanationText}</div>
            </div>
            {limitedCoverage ? (
              <div>
                <div className="text-xs font-medium text-zinc-500">Coverage Note</div>
                <div className="mt-1 text-sm text-zinc-700">
                  {aiCoverage ??
                    "This event is currently reported by a limited number of sources. Coverage may expand as more reports emerge."}
                </div>
              </div>
            ) : null}
            <details>
              <summary className="cursor-pointer text-xs font-medium text-zinc-600">Raw model output</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm text-zinc-900">{latestOutput}</pre>
            </details>
          </div>
        ) : (
          <div className="mt-4 text-sm text-zinc-600">No AI output yet. Click “Generate AI summary”.</div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-medium text-zinc-900">Original items</div>
        <div className="mt-1 text-xs text-zinc-500">Use these to verify what was actually reported.</div>
        <div className="mt-4 grid gap-3">
          {event.eventItems.map((ei) => {
            const it = ei.item;
            return (
              <div key={ei.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium text-zinc-900">{it.source.name}</div>
                  <div className="text-xs text-zinc-500">{formatDateTimeShort(it.publishedAt ?? it.fetchedAt)}</div>
                </div>
                <div className="mt-2 text-base font-semibold leading-snug text-zinc-900">{it.title}</div>
                {it.excerpt ? <div className="mt-2 text-sm text-zinc-600 line-clamp-3">{it.excerpt}</div> : null}
                {it.url ? (
                  <div className="mt-3 text-sm">
                    <Link className="text-zinc-900 underline underline-offset-4" href={it.url} target="_blank">
                      Original link
                    </Link>
                  </div>
                ) : null}
                {typeof ei.similarity === "number" ? (
                  <div className="mt-2 text-xs text-zinc-500">Similarity: {ei.similarity.toFixed(2)}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
