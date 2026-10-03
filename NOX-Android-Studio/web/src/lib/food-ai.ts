import type { ParsedFood } from "@/lib/food-parser";

const SYSTEM = `Du bist ein präziser Ernährungs-Assistent für eine deutsche Fitness-App.
Der User beschreibt was er gegessen hat. Antworte NUR mit einem validen JSON-Array, kein Markdown, kein Text.
Jedes Objekt: {"name": string, "grams": number, "kcal": number, "protein": number, "carbs": number, "fat": number}
- name: kurzer deutscher Name
- grams: geschätzte Menge in Gramm
- kcal, protein, carbs, fat: realistische Werte für diese Menge
Wenn unklar: sinnvolle Standardportion annehmen.
Beispiel: [{"name":"Hähnchenbrust","grams":200,"kcal":220,"protein":46,"carbs":0,"fat":4}]`;

const VISION_SYSTEM = `Du analysierst ein Foto einer Mahlzeit für eine deutsche Fitness-App.
Antworte NUR mit einem validen JSON-Array, kein Markdown, kein Text.
Jedes Objekt: {"name": string, "grams": number, "kcal": number, "protein": number, "carbs": number, "fat": number}
- name: kurzer deutscher Name des erkannten Lebensmittels
- grams: geschätzte Portionsgröße in Gramm
- kcal, protein, carbs, fat: realistische Werte für diese Portion
Schätze realistisch anhand sichtbarer Mengen. Mehrere Lebensmittel als separate Einträge.
Beispiel: [{"name":"Reis","grams":180,"kcal":230,"protein":5,"carbs":50,"fat":1},{"name":"Hähnchen","grams":150,"kcal":165,"protein":31,"carbs":0,"fat":4}]`;

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

const ENDPOINTS = [
  { url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini", label: "OpenAI" },
  { url: "https://api.deepseek.com/chat/completions", model: "deepseek-chat", label: "DeepSeek" },
] as const;

export async function analyzeFoodWithAI(
  text: string,
  apiKey: string,
): Promise<ParsedFood[]> {
  const key = apiKey.trim();
  if (!key) throw new Error("Kein API-Key hinterlegt.");

  let lastError: Error | null = null;
  for (const endpoint of ENDPOINTS) {
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
        if (res.status === 401 || res.status === 403) continue;
        throw lastError;
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      const items = normalizeItems(extractJson(content));
      if (!items.length) throw new Error("Keine Lebensmittel erkannt.");
      return items;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }
  throw lastError ?? new Error("Erkennung fehlgeschlagen.");
}

/** Analyze food photo with OpenAI vision (gpt-4o-mini). */
export async function analyzeFoodPhotoWithAI(
  dataUrl: string,
  apiKey: string,
): Promise<ParsedFood[]> {
  const key = apiKey.trim();
  if (!key) throw new Error("Kein API-Key hinterlegt.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: "system", content: VISION_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Was ist auf dem Teller? Schätze Portionsgrößen und Nährwerte." },
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("API-Key ungültig.");
    if (res.status === 429) throw new Error("Rate-Limit – später erneut versuchen.");
    throw new Error(`Foto-Analyse fehlgeschlagen (${res.status}). ${body.slice(0, 80)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const items = normalizeItems(extractJson(content));
  if (!items.length) throw new Error("Keine Lebensmittel auf dem Foto erkannt.");
  return items;
}

/** @deprecated */
export const analyzeFoodWithDeepSeek = analyzeFoodWithAI;

/** Convert File/Blob to compressed data URL for vision API */
export async function fileToDataUrl(file: Blob, maxSide = 768): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas nicht verfügbar.");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}
