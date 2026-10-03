import { FOOD_DB } from "@/lib/food-db";
import { parseFoodText, type ParsedFood } from "@/lib/food-parser";

export type SmartFoodResult = {
  items: ParsedFood[];
  confidence: number;
  explanation: string;
  offline: true;
};

const STOPWORDS = new Set([
  "ich", "habe", "gegessen", "heute", "gerade", "noch", "etwas", "ein", "eine",
  "einen", "und", "mit", "dazu", "zum", "zur", "von", "der", "die", "das", "g",
  "gramm", "ca", "circa", "etwa", "portion", "teller", "schale", "becher",
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

/** Local offline food matching – no network. */
export function analyzeFoodLocally(text: string): SmartFoodResult {
  const direct = parseFoodText(text);
  if (direct.length) {
    const normalized = normalize(text);
    const knownHits = FOOD_DB.filter((food) =>
      [food.name, ...food.aliases].some((name) =>
        normalized.includes(normalize(name)),
      ),
    ).length;
    const confidence = Math.min(0.98, 0.75 + knownHits * 0.06);
    return {
      items: direct,
      confidence,
      explanation: "Mengen und Lebensmittel aus der lokalen Liste erkannt.",
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
      if (names.some((name) => name === token)) score += 5;
      else if (names.some((name) => name.startsWith(token) && token.length >= 4))
        score += 3;
      else if (names.some((name) => name.includes(token) || token.includes(name)))
        score += 2;
    }
    return { food, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Kein automatisches 100g – nur pieceGrams (1 Stück) oder 0 → User trägt Menge ein
  const items = candidates.map((candidate) => {
    const grams = candidate.food.pieceGrams && candidate.food.pieceGrams > 0
      ? candidate.food.pieceGrams
      : 0;
    const f = grams > 0 ? grams / 100 : 0;
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
      ? Math.min(0.8, 0.38 + candidates[0].score * 0.07)
      : 0,
    explanation: candidates.length
      ? "Lebensmittel erkannt – Menge bitte selbst eintragen (oder war im Text)."
      : "Kein Treffer offline. Open Food Facts / manuell versuchen.",
    offline: true,
  };
}

export type PhotoInsight = {
  label: string;
  reason: string;
  confidence: number;
};

/** Lightweight local image stats – never uploads. */
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
  let red = 0,
    green = 0,
    yellow = 0,
    dark = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const max = Math.max(r, g, b);
    red += r > g * 1.25 && r > b * 1.2 ? 1 : 0;
    green += g > r * 1.15 && g > b * 1.08 ? 1 : 0;
    yellow += r > 140 && g > 120 && b < 100 ? 1 : 0;
    dark += max < 70 ? 1 : 0;
  }
  const total = data.length / 4;
  const insights: PhotoInsight[] = [];
  if (green / total > 0.08)
    insights.push({
      label: "Gemüse / Salat",
      reason: "Viele grüne Bildbereiche",
      confidence: 0.62,
    });
  if (yellow / total > 0.06)
    insights.push({
      label: "Reis / Kartoffeln / Gebäck",
      reason: "Helle gelb-braune Bereiche",
      confidence: 0.54,
    });
  if (red / total > 0.04)
    insights.push({
      label: "Tomate / Paprika / Fleisch",
      reason: "Rote bzw. warme Bereiche",
      confidence: 0.48,
    });
  if (dark / total > 0.18)
    insights.push({
      label: "Gebratenes / dunkle Soße",
      reason: "Viele dunkle Bereiche",
      confidence: 0.42,
    });
  if (!insights.length)
    insights.push({
      label: "Mahlzeit",
      reason: "Bitte Lebensmittel selbst eintragen",
      confidence: 0.25,
    });
  return insights.slice(0, 3);
}
