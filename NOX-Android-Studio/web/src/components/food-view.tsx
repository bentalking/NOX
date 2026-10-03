import { Camera, Check, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  analyzeFoodPhotoWithAI,
  analyzeFoodWithAI,
  fileToDataUrl,
} from "@/lib/food-ai";
import { QUICK_FOODS } from "@/lib/food-db";
import { foodByName, parseFoodText, portionOf, searchFoods } from "@/lib/food-parser";
import { analyzeFoodLocally, analyzeFoodSmart, analyzeFoodPhoto, type PhotoInsight } from "@/lib/local-ai";
import { remaining, sumFoods } from "@/lib/macros";
import { useAppStore } from "@/lib/store";
import type { FoodEntry } from "@/lib/types";
import { fmt, round0, round1 } from "@/lib/utils";

type Props = { date: string };

type PendingItem = {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function FoodView({ date }: Props) {
  const profile = useAppStore((s) => s.profile);
  const deepseekKey = useAppStore((s) => s.deepseekKey);
  const log = useAppStore((s) => s.logs[date]);
  const addFood = useAppStore((s) => s.addFood);
  const removeFood = useAppStore((s) => s.removeFood);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [pendingSource, setPendingSource] = useState<FoodEntry["source"]>("local");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoInsights, setPhotoInsights] = useState<PhotoInsight[]>([]);
  const [photoItems, setPhotoItems] = useState<PendingItem[] | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasKey = Boolean(deepseekKey?.trim());
  const foods = log?.foods ?? [];
  const eaten = sumFoods(foods);
  const left = remaining(profile, eaten);
  const hits = useMemo(() => (query.trim() ? searchFoods(query, 6) : []), [query]);

  function commit(items: PendingItem[], source: FoodEntry["source"]) {
    for (const item of items) {
      if (!item.grams || item.grams <= 0) continue;
      addFood(date, {
        id: crypto.randomUUID(),
        name: item.name,
        grams: item.grams,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        source,
        createdAt: Date.now(),
      });
    }
    setPending(null);
    setText("");
    toast.success("Eingetragen");
  }

  async function addFromText() {
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    try {
      let items = parseFoodText(value);
      let source: FoodEntry["source"] = "local";
      if (!items.length) {
        const smart = await analyzeFoodSmart(value);
        items = smart.items;
        source = smart.offline ? "local" : "ai";
      }
      if (!items.length && hasKey) {
        try {
          items = await analyzeFoodWithAI(value, deepseekKey);
          source = "ai";
        } catch {
          /* ignore */
        }
      }
      if (!items.length) {
        toast.error("Nichts erkannt – genauer schreiben oder suchen");
        return;
      }
      setPendingSource(source);
      setPending(items);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Ernährung · Reset 0:00</p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">Noch essen</h1>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <RemainCard label="Kalorien" value={left.kcal} unit="kcal" eaten={eaten.kcal} goal={profile.calorieGoal} />
        <RemainCard label="Protein" value={left.protein} unit="g" eaten={eaten.protein} goal={profile.proteinGoal} ok />
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <Label htmlFor="food-in">Was hast du gegessen?</Label>
        <Textarea
          id="food-in"
          className="mt-2"
          rows={3}
          placeholder="z. B. 2 Eier, 200g Hähnchenbrust und Reis"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3">
          <Button className="w-full" onClick={addFromText} disabled={busy}>
            <Plus className="size-4" />
            {busy ? "Erkennt…" : "Eintragen"}
          </Button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Lokal + Open Food Facts. Mengen wie „200 g“ angeben oder nach dem Erkennen eintragen.
        </p>
      </section>

      {pending && pending.length > 0 ? (
        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Gefunden – Menge prüfen</p>
            <button type="button" onClick={() => setPending(null)} className="size-8 text-subtle" aria-label="Schließen">
              <X className="mx-auto size-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">Gramm anpassen, dann übernehmen.</p>
          <div className="mt-3 space-y-2">
            {pending.map((item, index) => (
              <div key={`${item.name}-${index}`} className="rounded-lg bg-surface-2 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-muted shrink-0">{fmt(item.kcal)} kcal</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="decimal"
                    className="h-9 w-24 rounded-md border border-border bg-surface px-2 text-sm"
                    value={item.grams || ""}
                    placeholder="g"
                    onChange={(e) => {
                      const g = Number(e.target.value.replace(",", "."));
                      setPending((prev) => {
                        if (!prev) return prev;
                        const next = [...prev];
                        const cur = { ...next[index] };
                        const grams = Number.isFinite(g) && g >= 0 ? g : 0;
                        const dbItem = foodByName(cur.name);
                        if (dbItem && grams > 0) {
                          const p = portionOf(dbItem, grams);
                          next[index] = { name: p.name, grams: p.grams, kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat };
                        } else {
                          const baseG = cur.grams > 0 ? cur.grams : 100;
                          const factor = grams > 0 && baseG > 0 ? grams / baseG : 0;
                          next[index] = {
                            ...cur,
                            grams,
                            kcal: Math.round(cur.kcal * factor),
                            protein: Math.round(cur.protein * factor * 10) / 10,
                            carbs: Math.round(cur.carbs * factor * 10) / 10,
                            fat: Math.round(cur.fat * factor * 10) / 10,
                          };
                        }
                        return next;
                      });
                    }}
                  />
                  <span className="text-xs text-muted">g</span>
                  <span className="ml-auto text-xs text-muted">
                    P {fmt(item.protein, 1)} · KH {fmt(item.carbs, 1)} · F {fmt(item.fat, 1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Button
            className="mt-3 w-full"
            onClick={() => commit(pending, pendingSource)}
            disabled={pending.some((p) => !p.grams || p.grams <= 0)}
          >
            <Check className="size-4" /> Alles übernehmen
          </Button>
        </section>
      ) : null}

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-primary" />
          <p className="text-sm font-semibold">Foto</p>
        </div>
        <p className="mt-1 text-xs text-muted">
          {hasKey ? "Foto mit Vision-API." : "Ohne API-Key nur Hinweise. Key unter Werte."}
        </p>
        <div className="mt-3">
          <Button className="w-full" type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
            <Camera className="size-4" />
            {photoBusy ? "Analysiert…" : "Foto / Galerie"}
          </Button>
        </div>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setPhotoBusy(true);
            setPhotoOpen(true);
            if (photoUrl) URL.revokeObjectURL(photoUrl);
            setPhotoUrl(URL.createObjectURL(file));
            try {
              if (hasKey) {
                const dataUrl = await fileToDataUrl(file);
                const items = await analyzeFoodPhotoWithAI(dataUrl, deepseekKey);
                setPhotoItems(items);
                setPhotoInsights([]);
              } else {
                setPhotoInsights(await analyzeFoodPhoto(file));
                setPhotoItems(null);
              }
            } catch {
              setPhotoInsights(await analyzeFoodPhoto(file));
              setPhotoItems(null);
              toast.error("Foto-Analyse fehlgeschlagen");
            } finally {
              setPhotoBusy(false);
            }
          }}
        />
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-primary" />
          <p className="text-sm font-semibold">Suchen</p>
        </div>
        <Input className="mt-2" placeholder="Lebensmittel suchen…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="mt-2 space-y-1">
          {hits.map((item) => (
            <button
              key={item.name}
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2"
              onClick={() => {
                const g = item.pieceGrams ?? 0;
                if (g > 0) commit([portionOf(item, g)], "local");
                else setPending([portionOf(item, 0)]);
              }}
            >
              <span>{item.name}</span>
              <span className="text-xs text-muted">{item.kcal} kcal/100g</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-sm font-semibold">Schnell</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_FOODS.map((q) => {
            const item = foodByName(q.name);
            if (!item) return null;
            return (
              <Button key={q.name} type="button" variant="secondary" size="sm" onClick={() => commit([portionOf(item, q.grams)], "local")}>
                {q.name}
              </Button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-sm font-semibold">Heute</p>
        <div className="mt-2 space-y-2">
          {foods.length === 0 ? (
            <p className="text-xs text-muted">Noch nichts eingetragen.</p>
          ) : (
            foods.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                <div>
                  <p className="text-sm">{f.name}</p>
                  <p className="text-xs text-muted">
                    {fmt(f.grams, 0)} g · {fmt(f.kcal)} kcal · {fmt(f.protein, 1)} g Protein
                  </p>
                </div>
                <button type="button" className="size-8 text-subtle" onClick={() => removeFood(date, f.id)} aria-label="Löschen">
                  <Trash2 className="mx-auto size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {photoOpen ? (
        <Dialog open={photoOpen} onOpenChange={(o) => !o && setPhotoOpen(false)}>
          <DialogContent>
            <p className="font-semibold">Foto-Ergebnis</p>
            {photoUrl ? <img src={photoUrl} alt="Essen" className="mt-2 max-h-48 w-full object-cover rounded-lg" /> : null}
            {photoBusy ? (
              <p className="mt-2 text-sm text-muted">Analysiert…</p>
            ) : photoItems && photoItems.length ? (
              <div className="mt-2 space-y-2">
                {photoItems.map((it, i) => (
                  <div key={i} className="text-sm">{it.name} · {it.grams}g · {it.kcal} kcal</div>
                ))}
                <Button className="w-full" onClick={() => { commit(photoItems, "photo"); setPhotoOpen(false); }}>
                  Übernehmen
                </Button>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                {photoInsights.map((ins, i) => (
                  <p key={i} className="text-sm text-muted">{ins.label} – {ins.reason}</p>
                ))}
                <p className="text-xs text-muted mt-2">Bitte manuell eintragen oder API-Key setzen.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function RemainCard({
  label,
  value,
  unit,
  eaten,
  goal,
  ok,
}: {
  label: string;
  value: number;
  unit: string;
  eaten: number;
  goal: number;
  ok?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-heading text-xl font-semibold">
        {fmt(value, 0)} <span className="text-sm font-normal text-muted">{unit}</span>
      </p>
      <p className="text-xs text-muted">
        {fmt(eaten, 0)} / {fmt(goal, 0)} {unit}
      </p>
    </div>
  );
}
