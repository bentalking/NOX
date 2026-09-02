import { FOOD_DB } from "@/lib/food-db";
import type { FoodItem } from "@/lib/types";
import { round0, round1 } from "@/lib/utils";

export type ParsedFood = {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9.,\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function macrosFor(item: FoodItem, grams: number): ParsedFood {
  const f = grams / 100;
  return {
    name: item.name,
    grams: round1(grams),
    kcal: round0(item.kcal * f),
    protein: round1(item.protein * f),
    carbs: round1(item.carbs * f),
    fat: round1(item.fat * f),
  };
}

type Qty = { grams?: number; pieces?: number; ml?: number };

function parseQty(raw: string): { qty: Qty; rest: string } {
  const text = fold(raw);
  const kg = text.match(/(\d+(?:[.,]\d+)?)\s*kg/);
  if (kg) {
    const n = Number(kg[1].replace(",", "."));
    return { qty: { grams: n * 1000 }, rest: text.replace(kg[0], " ") };
  }
  const g = text.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramm)\b/);
  if (g) {
    const n = Number(g[1].replace(",", "."));
    return { qty: { grams: n }, rest: text.replace(g[0], " ") };
  }
  const ml = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|l)\b/);
  if (ml) {
    const n = Number(ml[1].replace(",", "."));
    const grams = ml[0].includes("l") && !ml[0].includes("ml") ? n * 1000 : n;
    return { qty: { ml: grams, grams }, rest: text.replace(ml[0], " ") };
  }
  const piece = text.match(
    /(\d+(?:[.,]\d+)?)\s*(?:x|stk|stueck|stück|st\.?|scheiben)?\b/,
  );
  if (piece) {
    const n = Number(piece[1].replace(",", "."));
    if (n > 0 && n <= 30) {
      return { qty: { pieces: n }, rest: text.replace(piece[0], " ") };
    }
  }
  return { qty: {}, rest: text };
}

function scoreItem(query: string, item: FoodItem): number {
  const q = fold(query);
  if (!q) return 0;
  const names = [item.name, ...item.aliases].map(fold).filter(Boolean);
  let best = 0;
  for (const n of names) {
    if (q === n) best = Math.max(best, 100 + n.length);
    else if (q.includes(n)) best = Math.max(best, 80 + n.length);
    else if (n.includes(q) && q.length >= 3) best = Math.max(best, 50 + q.length);
  }
  return best;
}

function findItem(query: string): FoodItem | null {
  let best: FoodItem | null = null;
  let bestScore = 0;
  for (const item of FOOD_DB) {
    const s = scoreItem(query, item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return bestScore >= 50 ? best : null;
}

function parseSegment(segment: string): ParsedFood | null {
  const { qty, rest } = parseQty(segment);
  const item = findItem(rest) ?? findItem(fold(segment));
  if (!item) return null;
  let grams = 100;
  if (qty.grams && qty.grams > 0) grams = qty.grams;
  else if (qty.pieces && item.pieceGrams) grams = qty.pieces * item.pieceGrams;
  else if (qty.pieces) grams = qty.pieces * 100;
  else if (item.pieceGrams && !/\d/.test(segment)) grams = item.pieceGrams;
  return macrosFor(item, grams);
}

export function parseFoodText(text: string): ParsedFood[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const parts = cleaned
    .split(/\s*(?:,|;|\+|\bund\b|\bmit\b|\bnachher\b|\bdann\b)\s*/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);
  const out: ParsedFood[] = [];
  for (const part of parts.length ? parts : [cleaned]) {
    const parsed = parseSegment(part);
    if (parsed) out.push(parsed);
  }
  if (out.length === 0) {
    const whole = parseSegment(cleaned);
    if (whole) out.push(whole);
  }
  return out;
}

export function searchFoods(query: string, limit = 8): FoodItem[] {
  const q = fold(query);
  if (q.length < 1) return FOOD_DB.slice(0, limit);
  return FOOD_DB.map((item) => ({ item, score: scoreItem(q, item) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}

export function foodByName(name: string): FoodItem | undefined {
  return FOOD_DB.find((f) => f.name === name);
}

export function portionOf(item: FoodItem, grams: number): ParsedFood {
  return macrosFor(item, grams);
}
