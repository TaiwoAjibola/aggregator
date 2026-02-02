"use client";

import { useState } from "react";

type ExtractArticleButtonProps = {
  itemId: string;
  itemTitle: string;
  hasBody: boolean;
};

export default function ExtractArticleButton({ itemId, itemTitle, hasBody }: ExtractArticleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function handleExtract() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/extract`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to extract article");
        return;
      }

      setContent(data.content);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="mt-2 text-sm text-red-600">
        ⚠️ {error}
      </div>
    );
  }

  if (content && expanded) {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Full Article Content:</span>
          <button
            onClick={() => setExpanded(false)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Collapse
          </button>
        </div>
        <div className="prose prose-sm max-w-none rounded-md bg-gray-50 p-4 text-gray-800">
          {content.split('\n').map((paragraph, idx) => (
            paragraph.trim() && <p key={idx} className="mb-2">{paragraph}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleExtract}
      disabled={loading}
      className="mt-2 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
    >
      {loading ? (
        <>
          <span className="animate-spin">⏳</span>
          Extracting...
        </>
      ) : (
        <>
          📄 Read Full Article
        </>
      )}
    </button>
  );
}
