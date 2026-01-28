"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SortMode = "recent" | "oldest";

export default function EventsFilters({
  topics,
  selectedTopic,
  sort,
  date,
  q,
}: {
  topics: string[];
  selectedTopic: string;
  sort: SortMode;
  date?: string;
  q?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q ?? "");

  function hrefWith({
    topic,
    sort: sortVal,
    date: dateVal,
    q: qVal,
  }: {
    topic?: string;
    sort?: SortMode;
    date?: string;
    q?: string;
  }): string {
    const params = new URLSearchParams();

    const topicVal = topic ?? selectedTopic;
    if (topicVal && topicVal !== "All") params.set("topic", topicVal);

    const sortVal2 = sortVal ?? sort;
    if (sortVal2 && sortVal2 !== "recent") params.set("sort", sortVal2);

    const dateVal2 = dateVal ?? date;
    if (dateVal2) params.set("date", dateVal2);

    const qVal2 = qVal ?? q;
    if (qVal2) params.set("q", qVal2);

    const qs = params.toString();
    return qs ? `/events?${qs}` : "/events";
  }

  // Debounced search -> URL param.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (query.trim() === (q ?? "")) return;
      router.push(hrefWith({ q: query.trim() }));
    }, 250);

    return () => clearTimeout(handle);
    // hrefWith is intentionally not in deps—it's rebuilt on each render but stable in behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, q, router, sort, selectedTopic, date]);

  return (
    <div className="grid gap-2 md:gap-3">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {topics.map((t) => {
            const active = t === selectedTopic;
            return (
              <Link
                key={t}
                href={hrefWith({ topic: t })}
                className={
                  active
                    ? "rounded-full border border-zinc-300 bg-white px-2 sm:px-3 py-1 text-xs font-medium text-zinc-900 whitespace-nowrap dark:border-white/15 dark:bg-white/10 dark:text-zinc-100"
                    : "rounded-full border border-zinc-200 bg-white px-2 sm:px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 whitespace-nowrap dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-white/10"
                }
              >
                {t}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col xs:flex-row xs:flex-wrap items-start xs:items-center gap-1 xs:gap-2 w-full sm:w-auto">
          <span className="text-xs text-zinc-600 dark:text-zinc-400 hidden xs:inline">Sort</span>
          <Link
            href={hrefWith({ sort: "recent" })}
            className={
              sort === "recent"
                ? "rounded-full border border-zinc-300 bg-white px-2 sm:px-3 py-1 text-xs font-medium text-zinc-900 dark:border-white/15 dark:bg-white/10 dark:text-zinc-100"
                : "rounded-full border border-zinc-200 bg-white px-2 sm:px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-white/10"
            }
          >
            Recent
          </Link>
          <Link
            href={hrefWith({ sort: "oldest" })}
            className={
              sort === "oldest"
                ? "rounded-full border border-zinc-300 bg-white px-2 sm:px-3 py-1 text-xs font-medium text-zinc-900 dark:border-white/15 dark:bg-white/10 dark:text-zinc-100"
                : "rounded-full border border-zinc-200 bg-white px-2 sm:px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:bg-white/10"
            }
          >
            Oldest
          </Link>

          <div className="flex items-center gap-1 xs:gap-2">
            <span className="text-xs text-zinc-600 dark:text-zinc-400 hidden xs:inline">Date</span>
            <input
              type="date"
              value={date ?? ""}
              onChange={(e) => router.push(hrefWith({ date: e.target.value }))}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 shadow-sm outline-none focus:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:focus:border-white/20"
            />
          </div>

          <div className="flex items-center gap-1 xs:gap-2 w-full xs:w-auto">
            <span className="text-xs text-zinc-600 dark:text-zinc-400 hidden xs:inline">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-8 flex-1 xs:w-32 sm:w-44 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white/20"
            />
            {(date || q) && (
              <button
                type="button"
                onClick={() => router.push(hrefWith({ date: "", q: "" }))}
                className="rounded-full border border-zinc-200 bg-white px-2 xs:px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-white/20 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {(date || q) && (
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {date ? <span>Showing events on {date}.</span> : null}
          {date && q ? <span className="mx-1 xs:mx-2">•</span> : null}
          {q ? <span>Matching &quot;{q}&quot;.</span> : null}
        </div>
      )}
    </div>
  );
}
