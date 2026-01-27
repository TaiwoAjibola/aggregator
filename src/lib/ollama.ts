import { z } from "zod";

const OllamaGenerateResponseSchema = z.object({
  response: z.string(),
});

export type OllamaConfig = {
  baseUrl: string;
  model: string;
  /**
   * Request timeout. If omitted, uses OLLAMA_TIMEOUT_MS (default 60000).
   */
  timeoutMs?: number;
  /**
   * Ollama generation options (e.g., num_ctx, num_predict, temperature).
   * If omitted, defaults are derived from env vars.
   */
  options?: Record<string, unknown>;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildDefaultOllamaOptionsFromEnv(): Record<string, unknown> {
  // Conservative defaults for laptops.
  // All are overridable via env vars.
  const options: Record<string, unknown> = {
    num_ctx: envInt("OLLAMA_NUM_CTX", 1024),
    num_predict: envInt("OLLAMA_NUM_PREDICT", 350),
    temperature: envFloat("OLLAMA_TEMPERATURE", 0.2),
    top_p: envFloat("OLLAMA_TOP_P", 0.9),
  };

  const numThreadRaw = process.env.OLLAMA_NUM_THREAD;
  if (numThreadRaw) {
    const parsed = Number.parseInt(numThreadRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) options.num_thread = parsed;
  }

  return options;
}

export async function ollamaGenerate(prompt: string, config: OllamaConfig): Promise<string> {
  const timeoutMs = config.timeoutMs ?? envInt("OLLAMA_TIMEOUT_MS", 60_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const options = {
    ...buildDefaultOllamaOptionsFromEnv(),
    ...(config.options ?? {}),
  };

  const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      model: config.model,
      prompt,
      stream: false,
      options,
    }),
  });

  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }

  const json = await res.json();
  const parsed = OllamaGenerateResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected Ollama response shape");
  }

  return parsed.data.response.trim();
}
