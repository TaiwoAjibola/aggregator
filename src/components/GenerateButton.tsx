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
      if (!res.ok) throw new Error(json?.error ?? `Request failed: ${res.status}`);
      window.location.reload();
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
        className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {loading ? "Refreshing…" : "Refresh overview"}
      </button>
      <div className="mt-2 text-xs text-zinc-500">Re-runs organization using the same source data.</div>
      {error ? <div className="mt-2 text-sm text-red-700">{error}</div> : null}
    </div>
  );
}
