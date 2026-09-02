import { Camera, Check, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUICK_FOODS } from "@/lib/food-db";
import { foodByName, parseFoodText, portionOf, searchFoods } from "@/lib/food-parser";
import { analyzeFoodLocally, analyzeFoodPhoto, type PhotoInsight } from "@/lib/local-ai";
import { remaining, sumFoods } from "@/lib/macros";
import { useAppStore } from "@/lib/store";
import type { FoodEntry } from "@/lib/types";
import { fmt, round0, round1 } from "@/lib/utils";

type Props = { date: string };

export function FoodView({ date }: Props) {
  const profile = useAppStore((s) => s.profile);
  const log = useAppStore((s) => s.logs[date]);
  const addFood = useAppStore((s) => s.addFood);
  const removeFood = useAppStore((s) => s.removeFood);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [pending, setPending] = useState<
    {
      name: string;
      grams: number;
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    }[]
  | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoInsights, setPhotoInsights] = useState<PhotoInsight[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);

  const foods = log?.foods ?? [];
  const eaten = sumFoods(foods);
  const left = remaining(profile, eaten);
  const hits = useMemo(() => (query.trim() ? searchFoods(query, 6) : []), [query]);

  function commit(
    items: {
      name: string;
      grams: number;
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    }[],
    source: FoodEntry["source"],
  ) {
    if (items.length === 0) {
      toast.error("Nichts erkannt. Formuliere anders oder trag manuell ein.");
      return;
    }
    for (const item of items) {
      addFood(date, {
        name: item.name,
        grams: item.grams,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs ?? 0,
        fat: item.fat ?? 0,
        source,
      });
    }
    toast.success(
      items.length === 1
        ? `${items[0].name} · ${fmt(items[0].kcal)} kcal`
        : `${items.length} Einträge hinzugefügt`,
    );
    setText("");
    setPending(null);
  }

  function addFromText() {
    const value = text.trim();
    if (value.length < 2) {
      toast.error("Schreib zuerst, was du gegessen hast.");
      return;
    }
    setBusy(true);
    try {
      let items = parseFoodText(value);
      if (!items.length) {
        const smart = analyzeFoodLocally(value);
        items = smart.items;
      }
      if (!items.length) {
        toast.error("Nichts erkannt. Nutze die Suche oder trage es manuell ein.");
        return;
      }
      if (items.length === 1) {
        commit(items, "local");
      } else {
        setPending(items);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Ernährung · Reset 0:00
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          Noch essen
        </h1>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <RemainCard
          label="Kalorien"
          value={left.kcal}
          unit="kcal"
          eaten={eaten.kcal}
          goal={profile.calorieGoal}
        />
        <RemainCard
          label="Protein"
          value={left.protein}
          unit="g"
          eaten={eaten.protein}
          goal={profile.proteinGoal}
          ok
        />
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
          Mengen wie „200 g“ oder „2 Eier“ werden erkannt. Alles bleibt auf dem Gerät.
        </p>
      </section>

      {pending && pending.length > 0 ? (
        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Gefundene Lebensmittel</p>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="size-8 text-subtle"
              aria-label="Schließen"
            >
              <X className="mx-auto size-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {pending.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
              >
                <span className="text-sm">{item.name}</span>
                <span className="text-xs text-muted">
                  {fmt(item.grams, 0)} g · {fmt(item.kcal)} kcal
                </span>
              </div>
            ))}
          </div>
          <Button
            className="mt-3 w-full"
            onClick={() => commit(pending, "local")}
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
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Optional: Foto bleibt auf dem Gerät und gibt nur Vorschläge. Du bestätigst selbst.
        </p>
        <div className="mt-3 flex gap-2">
          <label className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-fg">
            <Camera className="size-4" /> Foto aufnehmen
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPhotoBusy(true);
                setPhotoOpen(true);
                setPhotoUrl(URL.createObjectURL(file));
                try {
                  setPhotoInsights(await analyzeFoodPhoto(file));
                } finally {
                  setPhotoBusy(false);
                }
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_FOODS.map((q) => (
          <button
            key={q.name}
            type="button"
            onClick={() => {
              const item = foodByName(q.name);
              if (!item) return;
              const p = portionOf(item, q.grams);
              commit([p], "local");
            }}
            className="h-9 rounded-full bg-surface px-3 text-xs font-medium text-muted shadow-[var(--shadow-border)] hover:text-fg"
          >
            {q.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="h-9 rounded-full bg-surface-2 px-3 text-xs font-medium text-fg"
        >
          Manuell
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-subtle" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Lebensmittel suchen"
          className="pl-10"
        />
        {hits.length > 0 ? (
          <ul className="mt-2 overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-border)]">
            {hits.map((item) => (
              <li key={item.name}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm hover:bg-surface-2"
                  onClick={() => {
                    const grams = item.pieceGrams ?? 100;
                    commit([portionOf(item, grams)], "local");
                    setQuery("");
                  }}
                >
                  <span>{item.name}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {item.kcal} kcal / 100g · {item.protein}g P
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <section>
        <h2 className="font-heading text-base font-semibold">Heute</h2>
        {foods.length === 0 ? (
          <p className="mt-3 rounded-xl bg-surface px-4 py-6 text-sm text-muted shadow-[var(--shadow-border)]">
            Noch nichts eingetragen. Der Zähler startet jeden Tag um 0:00 neu.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {foods.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-3 shadow-[var(--shadow-border)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted tabular-nums">
                    {fmt(f.grams, 0)} g · {fmt(f.kcal)} kcal · {fmt(f.protein, 1)} g Protein
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFood(date, f.id)}
                  className="relative size-11 rounded-md text-subtle hover:bg-surface-2 hover:text-danger"
                  aria-label="Eintrag löschen"
                >
                  <Trash2 className="mx-auto size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {photoOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-[32rem] overflow-hidden rounded-2xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="font-heading font-semibold">Foto-Vorschläge</p>
                <p className="text-xs text-muted">Bleibt auf dem Gerät</p>
              </div>
              <button
                onClick={() => {
                  setPhotoOpen(false);
                  if (photoUrl) URL.revokeObjectURL(photoUrl);
                  setPhotoUrl(null);
                }}
                className="size-9 text-subtle"
              >
                <X className="mx-auto size-5" />
              </button>
            </div>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Dein Essen"
                className="max-h-72 w-full object-cover"
              />
            ) : null}
            <div className="p-4">
              {photoBusy ? (
                <p className="text-sm text-muted">Analysiert…</p>
              ) : (
                <>
                  <div className="mt-1 space-y-2">
                    {photoInsights.map((insight) => (
                      <button
                        key={insight.label}
                        type="button"
                        onClick={() => {
                          setText((t) =>
                            t ? `${t}, ${insight.label}` : insight.label,
                          );
                          setPhotoOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg bg-surface-2 px-3 py-3 text-left"
                      >
                        <span>
                          <span className="block text-sm font-medium">
                            {insight.label}
                          </span>
                          <span className="text-xs text-muted">
                            {insight.reason}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-subtle">
                    Nur Vorschläge – bitte Portion und Lebensmittel selbst prüfen.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <ManualDialog
          onAdd={(item) => {
            commit([item], "manual");
            setManualOpen(false);
          }}
        />
      </Dialog>
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
  const over = value < 0;
  const pct = goal > 0 ? Math.min(100, (eaten / goal) * 100) : 0;
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {over ? `${label} drüber` : `${label} übrig`}
      </p>
      <p
        className={`mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight ${
          over ? "text-danger" : ok ? "text-ok" : "text-fg"
        }`}
      >
        {fmt(Math.abs(Math.round(value)))}
        <span className="ml-1 text-sm font-medium text-muted">{unit}</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full ${over ? "bg-danger" : ok ? "bg-ok" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-subtle tabular-nums">
        {fmt(Math.round(eaten))} / {fmt(goal)}
      </p>
    </div>
  );
}

function ManualDialog({
  onAdd,
}: {
  onAdd: (item: {
    name: string;
    grams: number;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("100");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");

  return (
    <DialogContent title="Manuell eintragen">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1.5">
            <Label>Gramm</Label>
            <Input
              type="number"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>kcal</Label>
            <Input
              type="number"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Protein</Label>
            <Input
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </label>
        </div>
        <Button
          className="mt-1"
          onClick={() => {
            if (!name.trim() || !kcal) {
              toast.error("Name und kcal werden gebraucht.");
              return;
            }
            onAdd({
              name: name.trim(),
              grams: Number(grams) || 0,
              kcal: round0(Number(kcal) || 0),
              protein: round1(Number(protein) || 0),
              carbs: 0,
              fat: 0,
            });
          }}
        >
          Hinzufügen
        </Button>
      </div>
    </DialogContent>
  );
}
