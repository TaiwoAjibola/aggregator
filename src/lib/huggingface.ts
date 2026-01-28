const DEFAULT_MODEL = "mistralai/Mistral-7B-Instruct-v0.1";

export type HuggingFaceConfig = {
  apiToken: string;
  model?: string;
  timeoutMs?: number;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function huggingFaceGenerate(prompt: string, config: HuggingFaceConfig): Promise<string> {
  const model = config.model ?? DEFAULT_MODEL;
  const timeoutMs = config.timeoutMs ?? envInt("HF_TIMEOUT_MS", 120_000);
  const apiToken = config.apiToken;

  if (!apiToken) {
    throw new Error("HF_API_TOKEN is not set");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 512,
          temperature: 0.2,
          top_p: 0.9,
        },
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Hugging Face request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    const json = await res.json();

    // HF returns an array with a single object containing generated_text
    if (!Array.isArray(json) || json.length === 0) {
      throw new Error("Unexpected Hugging Face response format");
    }

    const generated = json[0]?.generated_text;
    if (!generated) {
      throw new Error("No generated text in Hugging Face response");
    }

    // Remove the prompt from the response (HF returns prompt + generated text)
    return generated.replace(prompt, "").trim();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}
