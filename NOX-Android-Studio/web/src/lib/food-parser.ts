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

const PORTION_WORDS: Record<string, number> = {
  teller: 300,
  portion: 250,
  handvoll: 30,
  scheibe: 40,
  scheiben: 40,
  glas: 200,
  becher: 150,
  schale: 150,
  schussel: 250,
  schuessel: 250,
  kugel: 50,
  el: 15,
  essloeffel: 15,
  tl: 5,
  teeloeffel: 5,
  packung: 200,
  dose: 150,
  riegel: 45,
  tube: 30,
};

type Qty = { grams?: number; pieces?: number; ml?: number };

function parseQty(raw: string): { qty: Qty; rest: string } {
  const text = fold(raw);
  const kg = text.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kg) {
    const n = Number(kg[1].replace(",", "."));
    return { qty: { grams: n * 1000 }, rest: text.replace(kg[0], " ") };
  }
  const g = text.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramm)\b/);
  if (g) {
    const n = Number(g[1].replace(",", "."));
    return { qty: { grams: n }, rest: text.replace(g[0], " ") };
  }
  const ml = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ml)\b/);
  if (ml) {
    const n = Number(ml[1].replace(",", "."));
    return { qty: { ml: n, grams: n }, rest: text.replace(ml[0], " ") };
  }
  const liter = text.match(/(\d+(?:[.,]\d+)?)\s*l\b/);
  if (liter) {
    const n = Number(liter[1].replace(",", "."));
    return { qty: { ml: n * 1000, grams: n * 1000 }, rest: text.replace(liter[0], " ") };
  }
  const el = text.match(/(\d+(?:[.,]\d+)?)\s*(?:el|essloeffel)\b/);
  if (el) {
    const n = Number(el[1].replace(",", "."));
    return { qty: { grams: n * 15 }, rest: text.replace(el[0], " ") };
  }
  const tl = text.match(/(\d+(?:[.,]\d+)?)\s*(?:tl|teeloeffel)\b/);
  if (tl) {
    const n = Number(tl[1].replace(",", "."));
    return { qty: { grams: n * 5 }, rest: text.replace(tl[0], " ") };
  }
  for (const [word, grams] of Object.entries(PORTION_WORDS)) {
    if (["el", "essloeffel", "tl", "teeloeffel"].includes(word)) continue;
    const re = new RegExp(`(\\d+(?:[.,]\\d+)?)?\\s*${word}\\b`);
    const m = text.match(re);
    if (m) {
      const mult = m[1] ? Number(m[1].replace(",", ".")) : 1;
      return { qty: { grams: mult * grams }, rest: text.replace(m[0], " ") };
    }
  }
  const piece = text.match(
    /(\d+(?:[.,]\d+)?)\s*(?:x|stk|stueck|stück|st\.?|scheiben|scheibe|riegel)?\b/,
  );
  if (piece) {
    const n = Number(piece[1].replace(",", "."));
    if (n > 0 && n <= 40) {
      return { qty: { pieces: n }, rest: text.replace(piece[0], " ") };
    }
  }
  return { qty: {}, rest: text };
}

/** Score food match – longer / exact names win; short generic tokens alone never win. */
function scoreItem(query: string, item: FoodItem): number {
  const q = fold(query);
  if (!q) return 0;
  const names = [item.name, ...item.aliases].map(fold).filter(Boolean);
  let best = 0;
  const qTokens = q.split(" ").filter((t) => t.length >= 2);

  for (const n of names) {
    if (q === n) {
      best = Math.max(best, 250 + n.length);
      continue;
    }
    // full alias contained in query (e.g. "bueno white" in "1x bueno white")
    if (n.length >= 4 && q.includes(n)) {
      best = Math.max(best, 150 + n.length * 2);
      continue;
    }
    // query is prefix of long name
    if (q.length >= 4 && n.startsWith(q)) {
      best = Math.max(best, 90 + q.length);
      continue;
    }
    const nTokens = n.split(" ").filter((t) => t.length >= 2);
    let exactTok = 0;
    let softTok = 0;
    for (const qt of qTokens) {
      if (nTokens.some((nt) => nt === qt)) {
        exactTok += 1;
      } else if (
        qt.length >= 4 &&
        nTokens.some((nt) => nt.startsWith(qt) || qt.startsWith(nt))
      ) {
        softTok += 1;
      }
    }
    // multi-word query needs at least 2 token matches (prevents "egg white" → Bueno White)
    if (qTokens.length >= 2) {
      if (exactTok < 2 && !(exactTok >= 1 && softTok >= 1)) continue;
      best = Math.max(best, 50 + exactTok * 35 + softTok * 15 + n.length);
    } else {
      // single token: only exact token match and token length >= 4
      const qt = qTokens[0] ?? "";
      if (qt.length >= 4 && nTokens.some((nt) => nt === qt)) {
        best = Math.max(best, 60 + qt.length);
      } else if (qt.length >= 5 && n.includes(qt)) {
        best = Math.max(best, 55 + qt.length);
      }
    }
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
    } else if (s === bestScore && best && s > 0) {
      // prefer longer name on tie
      if (item.name.length > best.name.length) best = item;
    }
  }
  return bestScore >= 55 ? best : null;
}

function parseSegment(segment: string): ParsedFood | null {
  const { qty, rest } = parseQty(segment);
  const item = findItem(rest) ?? findItem(fold(segment));
  if (!item) return null;
  let grams = 100;
  if (qty.grams && qty.grams > 0) grams = qty.grams;
  else if (qty.pieces && item.pieceGrams) grams = qty.pieces * item.pieceGrams;
  else if (qty.pieces) grams = qty.pieces * (item.pieceGrams ?? 100);
  else if (item.pieceGrams && !/\d/.test(segment)) grams = item.pieceGrams;
  return macrosFor(item, grams);
}

export function parseFoodText(text: string): ParsedFood[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const parts = cleaned
    .split(/\s*(?:,|;|\+|\/|\bund\b|\bmit\b|\bplus\b|\bdazu\b|\bnachher\b|\bdann\b|\bsowie\b)\s*/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);
  const out: ParsedFood[] = [];
  const seen = new Set<string>();
  for (const part of parts.length ? parts : [cleaned]) {
    const parsed = parseSegment(part);
    if (parsed) {
      const key = `${parsed.name}-${parsed.grams}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(parsed);
      }
    }
  }
  if (out.length === 0) {
    const whole = parseSegment(cleaned);
    if (whole) out.push(whole);
  }
  return out;
}

export function searchFoods(query: string, limit = 10): FoodItem[] {
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
