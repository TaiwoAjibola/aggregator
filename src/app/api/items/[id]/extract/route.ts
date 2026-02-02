import "dotenv/config";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractArticleContent } from "@/lib/articleExtractor";

export const runtime = "nodejs";

/**
 * GET /api/items/[id]/extract
 * Extract full article content for an item
 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const item = await db().item.findUnique({
      where: { id },
      include: { source: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check if extraction is disabled
    if (process.env.ENABLE_FULL_TEXT_EXTRACTION === "0") {
      return NextResponse.json({
        error: "Full-text extraction is disabled",
        body: item.body,
      });
    }

    // If we already have substantial content, return it
    if (item.body && item.body.length > 500) {
      return NextResponse.json({
        ok: true,
        cached: true,
        content: item.body,
        source: item.source.name,
      });
    }

    // Extract from URL
    if (!item.url) {
      return NextResponse.json({
        error: "Item has no URL for extraction",
        body: item.body,
      });
    }

    const extracted = await extractArticleContent(item.url);

    if (!extracted?.content) {
      return NextResponse.json({
        ok: false,
        error: "Could not extract article content",
        body: item.body,
      });
    }

    // Update item with extracted content
    await db().item.update({
      where: { id },
      data: { body: extracted.content },
    });

    return NextResponse.json({
      ok: true,
      cached: false,
      content: extracted.content,
      source: item.source.name,
      metadata: {
        title: extracted.title,
        author: extracted.author,
        published: extracted.published,
        image: extracted.image,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Article extraction failed for item ${id}: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
