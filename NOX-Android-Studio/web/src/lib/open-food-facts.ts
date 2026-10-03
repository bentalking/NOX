import type { ParsedFood } from "@/lib/food-parser";

const UA = "NOX-Fitness-App/1.0 (Android; offline-first fitness tracker)";

type OffProduct = {
  product_name?: string;
  product_name_de?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    serving_size?: string;
  };
  serving_size?: string;
};

function parseServingGrams(serving?: string): number | null {
  if (!serving) return null;
  const m = serving.match(/(\d+(?:[.,]\d+)?)\s*g/i);
  if (m) return Number(m[1].replace(",", "."));
  return null;
}

function productToParsed(p: OffProduct, grams = 100): ParsedFood | null {
  const n = p.nutriments;
  if (!n) return null;
  const name = (p.product_name_de || p.product_name || "Produkt").trim();
  if (!name) return null;
  const kcal100 = n["energy-kcal_100g"];
  const prot100 = n.proteins_100g;
  const carb100 = n.carbohydrates_100g;
  const fat100 = n.fat_100g;
  if (kcal100 == null && prot100 == null) return null;
  const f = grams / 100;
  return {
    name: name.slice(0, 48),
    grams: Math.round(grams * 10) / 10,
    kcal: Math.round((kcal100 ?? 0) * f),
    protein: Math.round((prot100 ?? 0) * f * 10) / 10,
    carbs: Math.round((carb100 ?? 0) * f * 10) / 10,
    fat: Math.round((fat100 ?? 0) * f * 10) / 10,
  };
}

/** Lookup by barcode – no API key required */
export async function lookupBarcode(barcode: string): Promise<ParsedFood | null> {
  const code = barcode.replace(/\D/g, "");
  if (code.length < 8) return null;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; product?: OffProduct };
    if (data.status !== 1 || !data.product) return null;
    const serving = parseServingGrams(data.product.serving_size);
    return productToParsed(data.product, serving ?? 100);
  } catch {
    return null;
  }
}

/** Search Open Food Facts by name. No key required. */
export async function searchOpenFoodFacts(
  query: string,
  limit = 5,
): Promise<ParsedFood[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
      `&search_simple=1&action=process&json=1&page_size=${limit}&fields=product_name,product_name_de,nutriments,serving_size`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: OffProduct[] };
    const out: ParsedFood[] = [];
    for (const p of data.products ?? []) {
      const parsed = productToParsed(p, 100);
      if (parsed && parsed.kcal > 0) out.push(parsed);
    }
    return out.slice(0, limit);
  } catch {
    return [];
  }
}
