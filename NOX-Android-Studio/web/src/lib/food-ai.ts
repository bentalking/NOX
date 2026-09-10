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

export async function analyzeFoodWithDeepSeek(
  text: string,
  apiKey: string,
): Promise<ParsedFood[]> {
  const key = apiKey.trim();
  if (!key) throw new Error("Kein API-Key hinterlegt.");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("API-Key ungültig.");
    if (res.status === 402) throw new Error("DeepSeek-Guthaben leer.");
    throw new Error(`Anfrage fehlgeschlagen (${res.status}). ${body.slice(0, 120)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);
  const items = normalizeItems(parsed);
  if (!items.length) throw new Error("Keine Lebensmittel erkannt.");
  return items;
}
