import type { ParsedFood } from "@/lib/food-parser";

const SYSTEM = `Du bist ein präziser Ernährungs-Assistent für eine deutsche Fitness-App.
Der User beschreibt was er gegessen hat. Antworte NUR mit einem validen JSON-Array, kein Markdown, kein Text.
Jedes Objekt: {"name": string, "grams": number, "kcal": number, "protein": number, "carbs": number, "fat": number}
- name: kurzer deutscher Name
- grams: geschätzte Menge in Gramm
- kcal, protein, carbs, fat: realistische Werte für diese Menge
Wenn unklar: sinnvolle Standardportion annehmen.
Beispiel: [{"name":"Hähnchenbrust","grams":200,"kcal":220,"protein":46,"carbs":0,"fat":4}]`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
  }
  return null;
}

function normalizeItems(raw: unknown): ParsedFood[] {
  if (!Array.isArray(raw)) return [];
  const out: ParsedFood[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    if (!name) continue;
    const grams = Number(r.grams) || 100;
    const kcal = Number(r.kcal) || 0;
    const protein = Number(r.protein) || 0;
    const carbs = Number(r.carbs) || 0;
    const fat = Number(r.fat) || 0;
    out.push({
      name,
      grams: Math.round(grams * 10) / 10,
      kcal: Math.round(kcal),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    });
  }
  return out;
}

/** Detect provider from key. */
function resolveEndpoint(apiKey: string): { url: string; model: string; label: string } {
  const key = apiKey.trim().toLowerCase();
  if (key.startsWith("sk-proj-") || key.includes("openai")) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      label: "OpenAI",
    };
  }
  // Default: try OpenAI first for classic sk- keys (user has OpenAI), DeepSeek as fallback
  return {
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    label: "OpenAI",
  };
}

export async function analyzeFoodWithAI(
  text: string,
  apiKey: string,
): Promise<ParsedFood[]> {
  const key = apiKey.trim();
  if (!key) throw new Error("Kein API-Key hinterlegt.");

  const endpoints = [
    { url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini", label: "OpenAI" },
    { url: "https://api.deepseek.com/chat/completions", model: "deepseek-chat", label: "DeepSeek" },
  ];

  // Prefer OpenAI if key looks like OpenAI project key
  if (key.startsWith("sk-") && !key.startsWith("sk-or-")) {
    // already ordered OpenAI first
  } else {
    endpoints.reverse();
  }

  let lastError: Error | null = null;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: endpoint.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: text },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const msg =
          res.status === 401
            ? `${endpoint.label}: Key ungültig`
            : res.status === 429
              ? `${endpoint.label}: Rate-Limit`
              : `${endpoint.label}: Fehler ${res.status}`;
        lastError = new Error(`${msg}. ${body.slice(0, 80)}`);
        if (res.status === 401 || res.status === 403) continue; // try other provider
        throw lastError;
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      const parsed = extractJson(content);
      const items = normalizeItems(parsed);
      if (!items.length) throw new Error("Keine Lebensmittel erkannt.");
      return items;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }
  throw lastError ?? new Error("Erkennung fehlgeschlagen.");
}

/** @deprecated use analyzeFoodWithAI */
export const analyzeFoodWithDeepSeek = analyzeFoodWithAI;
