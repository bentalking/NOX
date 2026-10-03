import { FOOD_DB } from "@/lib/food-db";
import { parseFoodText, type ParsedFood } from "@/lib/food-parser";
import { searchOpenFoodFacts } from "@/lib/open-food-facts";

export type SmartFoodResult = {
  items: ParsedFood[];
  confidence: number;
  explanation: string;
  offline: boolean;
};

const STOPWORDS = new Set([
  "ich", "habe", "gegessen", "heute", "gerade", "noch", "etwas", "ein", "eine",
  "einen", "und", "mit", "dazu", "zum", "zur", "von", "der", "die", "das", "g",
  "gramm", "ca", "circa", "etwa", "portion", "teller", "schale", "becher",
  "fuer", "für", "mein", "meine", "mittags", "abends", "morgens", "snack",
]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

/** Local offline food matching – no network, no API key. */
export function analyzeFoodLocally(text: string): SmartFoodResult {
  const direct = parseFoodText(text);
  if (direct.length) {
    const normalized = normalize(text);
    const knownHits = FOOD_DB.filter((food) =>
      [food.name, ...food.aliases].some((name) =>
        normalized.includes(normalize(name)),
      ),
    ).length;
    const confidence = Math.min(0.98, 0.78 + knownHits * 0.05);
    return {
      items: direct,
      confidence,
      explanation: "Lokal erkannt – Mengen und Nährwerte aus der NOX-Datenbank.",
      offline: true,
    };
  }

  const tokens = normalize(text)
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

  const candidates = FOOD_DB.map((food) => {
    const names = [food.name, ...food.aliases].map(normalize);
    let score = 0;
    for (const token of tokens) {
      if (names.some((name) => name === token)) score += 6;
      else if (names.some((name) => name.startsWith(token) && token.length >= 4))
        score += 4;
      else if (names.some((name) => name.includes(token) || token.includes(name)))
        score += 2;
    }
    return { food, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const items = candidates.map((candidate) => {
    const grams = candidate.food.pieceGrams ?? 100;
    const f = grams / 100;
    return {
      name: candidate.food.name,
      grams,
      kcal: Math.round(candidate.food.kcal * f),
      protein: Math.round(candidate.food.protein * f * 10) / 10,
      carbs: Math.round(candidate.food.carbs * f * 10) / 10,
      fat: Math.round(candidate.food.fat * f * 10) / 10,
    };
  });

  return {
    items,
    confidence: candidates.length
      ? Math.min(0.85, 0.4 + candidates[0].score * 0.06)
      : 0,
    explanation: candidates.length
      ? "Lokale Treffer aus der NOX-DB – Portion bitte prüfen."
      : "Kein Treffer offline. Online (Open Food Facts) wird versucht…",
    offline: true,
  };
}

/** Smart: 1) offline DB  2) Open Food Facts (free, no key) */
export async function analyzeFoodSmart(text: string): Promise<SmartFoodResult> {
  const local = analyzeFoodLocally(text);
  if (local.items.length && local.confidence >= 0.7) {
    return local;
  }

  try {
    const off = await searchOpenFoodFacts(text, 6);
    if (off.length) {
      return {
        items: off,
        confidence: 0.75,
        explanation: "Open Food Facts – weltweite Produktdatenbank (online).",
        offline: false,
      };
    }
  } catch {
    /* network offline */
  }

  if (local.items.length) return local;

  return {
    items: [],
    confidence: 0,
    explanation:
      "Nichts gefunden. Tipp: genauer schreiben (z.B. „200g Hähnchenbrust“) oder manuell eintragen.",
    offline: true,
  };
}

export type PhotoInsight = {
  label: string;
  reason: string;
  confidence: number;
};

export async function analyzeFoodPhoto(file: Blob): Promise<PhotoInsight[]> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const size = 96;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  const data = ctx.getImageData(0, 0, size, size).data;
  let red = 0, green = 0, yellow = 0, dark = 0, white = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    red += r > g * 1.25 && r > b * 1.2 ? 1 : 0;
    green += g > r * 1.15 && g > b * 1.08 ? 1 : 0;
    yellow += r > 140 && g > 120 && b < 100 ? 1 : 0;
    dark += max < 70 ? 1 : 0;
    white += min > 200 ? 1 : 0;
  }
  const total = data.length / 4;
  const insights: PhotoInsight[] = [];
  if (green / total > 0.08)
    insights.push({ label: "Gemüse / Salat", reason: "Viele grüne Bildbereiche", confidence: 0.62 });
  if (yellow / total > 0.06)
    insights.push({ label: "Reis / Kartoffeln / Gebäck", reason: "Helle gelb-braune Bereiche", confidence: 0.54 });
  if (red / total > 0.04)
    insights.push({ label: "Tomate / Paprika / Fleisch", reason: "Rote bzw. warme Bereiche", confidence: 0.48 });
  if (dark / total > 0.18)
    insights.push({ label: "Gebratenes / dunkle Soße", reason: "Viele dunkle Bereiche", confidence: 0.42 });
  if (white / total > 0.15)
    insights.push({ label: "Reis / Joghurt / Käse", reason: "Helle Flächen", confidence: 0.4 });
  if (!insights.length)
    insights.push({ label: "Mahlzeit", reason: "Bitte Lebensmittel selbst eintragen", confidence: 0.25 });
  return insights.slice(0, 3);
}
