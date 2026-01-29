"use client";

import { useState } from "react";

type Props = {
  eventId: string;
};

export function GenerateButton({ eventId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/generate`, { method: "POST" });
      const json = await res.json().catch(() => null);
      
      // Handle both success and error gracefully
      if (json?.ok === false) {
        setError(json?.error ?? "AI generation unavailable");
      } else if (!res.ok) {
        throw new Error(json?.error ?? `Request failed: ${res.status}`);
      } else {
        // Success - reload to show new summary
        window.location.reload();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={loading}
        className="w-full md:w-auto inline-flex items-center justify-center rounded-lg md:rounded-lg bg-zinc-900 px-3 md:px-4 py-2 md:py-2 text-xs md:text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 transition"
      >
        {loading ? "Refreshing…" : "Refresh overview"}
      </button>
      <div className="mt-1 md:mt-2 text-xs text-zinc-500">Re-runs organization using the same source data.</div>
      {error ? <div className="mt-2 text-xs md:text-sm text-red-700">{error}</div> : null}
    </div>
  );
}
