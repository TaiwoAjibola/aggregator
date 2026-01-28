const DEFAULT_MODEL = "google/flan-t5-base";

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
          max_length: 512,
          min_length: 50,
        },
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 404) {
        throw new Error(
          `Model "${model}" not found or not deployed. Ensure your HF_API_TOKEN is correct and has API access.`,
        );
      }
      if (res.status === 503) {
        throw new Error(
          "Model is loading or temporarily unavailable. Hugging Face servers are busy. Try again in a few seconds.",
        );
      }
      throw new Error(
        `Hugging Face request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`,
      );
    }

    const json = await res.json();

    // HF returns an array with summary_text for summarization tasks
    let result: string;
    
    if (Array.isArray(json) && json.length > 0) {
      // Generated text format
      result = json[0]?.generated_text || json[0]?.summary_text || "";
    } else if (typeof json === "object" && json !== null) {
      // Direct response format
      result = json.generated_text || json.summary_text || "";
    } else {
      throw new Error("Unexpected Hugging Face response format");
    }

    if (!result || typeof result !== "string") {
      throw new Error("No generated text in Hugging Face response");
    }

    // Remove the prompt from the response if it's included
    return result.replace(prompt, "").trim();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }

    // Remove the prompt from the response (HF returns prompt + generated text)
    return generated.replace(prompt, "").trim();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}
