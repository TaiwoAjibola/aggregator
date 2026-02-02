import { z } from "zod";

const GroqChatCompletionResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    }),
  ),
});

export type GroqConfig = {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Generate text using Groq's chat completion API.
 * Free tier: 30 requests/minute, 6,000 tokens/minute
 * Ultra-fast inference (10-20x faster than local Ollama)
 */
export async function groqGenerate(prompt: string, config: GroqConfig): Promise<string> {
  const model = config.model ?? process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const timeoutMs = config.timeoutMs ?? envInt("GROQ_TIMEOUT_MS", 30_000);
  const apiKey = config.apiKey;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
        top_p: 0.9,
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401) {
        throw new Error("Invalid GROQ_API_KEY. Please check your API key at https://console.groq.com");
      }
      if (res.status === 429) {
        throw new Error(
          "Groq rate limit exceeded. Free tier: 30 requests/minute, 6,000 tokens/minute. Please wait and retry.",
        );
      }
      if (res.status === 404) {
        throw new Error(
          `Model "${model}" not found. Available models: llama-3.3-70b-versatile, mixtral-8x7b-32768, llama-3.1-8b-instant`,
        );
      }
      throw new Error(`Groq API request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
    }

    const json = await res.json();
    const parsed = GroqChatCompletionResponseSchema.safeParse(json);
    
    if (!parsed.success) {
      console.error("Groq response parse error:", parsed.error);
      throw new Error("Unexpected Groq API response format");
    }

    const content = parsed.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Groq API returned empty response");
    }

    return content.trim();
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Groq API request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}
