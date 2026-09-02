import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcTdee, suggestedGoals } from "@/lib/defaults";
import { useAppStore } from "@/lib/store";
import type { ActivityLevel, Goal, Sex } from "@/lib/types";
import { fmt } from "@/lib/utils";

type Props = { date: string };

const ACTIVITY: { id: ActivityLevel; label: string }[] = [
  { id: "sedentary", label: "Sitzend" },
  { id: "light", label: "Leicht" },
  { id: "moderate", label: "Moderat" },
  { id: "active", label: "Aktiv" },
  { id: "very", label: "Sehr aktiv" },
];

const GOALS: { id: Goal; label: string }[] = [
  { id: "cut", label: "Defizit" },
  { id: "maintain", label: "Halten" },
  { id: "bulk", label: "Aufbau" },
];

export function StatsView({ date }: Props) {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const logBodyWeight = useAppStore((s) => s.logBodyWeight);
  const resetToday = useAppStore((s) => s.resetToday);
  const logs = useAppStore((s) => s.logs);
  const [weight, setWeight] = useState(String(profile.weightKg));

  const tdee = calcTdee(profile);
  const suggested = suggestedGoals(profile);

  const history = Object.values(logs)
    .filter((l) => l.bodyWeightKg)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Werte
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          Deine Stats
        </h1>
      </header>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-heading text-base font-semibold">Profil</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Name">
            <Input
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Segment
              label="Geschlecht"
              value={profile.sex}
              options={[
                { id: "male", label: "Mann" },
                { id: "female", label: "Frau" },
              ]}
              onChange={(sex) => updateProfile({ sex: sex as Sex })}
            />
            <Field label="Alter">
              <Input
                type="number"
                min={14}
                max={90}
                value={profile.age}
                onChange={(e) =>
                  updateProfile({ age: Number(e.target.value) || profile.age })
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Größe cm">
              <Input
                type="number"
                min={120}
                max={230}
                value={profile.heightCm}
                onChange={(e) =>
                  updateProfile({
                    heightCm: Number(e.target.value) || profile.heightCm,
                  })
                }
              />
            </Field>
            <Field label="Gewicht kg">
              <Input
                type="number"
                min={40}
                max={250}
                step={0.1}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onBlur={() => {
                  const kg = Number(weight);
                  if (kg > 0) logBodyWeight(date, kg);
                }}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-heading text-base font-semibold">Tagesziele</h2>
        <p className="mt-1 text-xs text-muted">
          Grundumsatz + Alltag ≈ {fmt(tdee)} kcal. Ziele kannst du frei
          überschreiben.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <ChipRow
            value={profile.activity}
            options={ACTIVITY}
            onChange={(activity) =>
              updateProfile({ activity: activity as ActivityLevel })
            }
          />
          <ChipRow
            value={profile.goal}
            options={GOALS}
            onChange={(goal) => updateProfile({ goal: goal as Goal })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label="kcal">
              <Input
                type="number"
                value={profile.calorieGoal}
                onChange={(e) =>
                  updateProfile({
                    calorieGoal: Number(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <Field label="Protein g">
              <Input
                type="number"
                value={profile.proteinGoal}
                onChange={(e) =>
                  updateProfile({
                    proteinGoal: Number(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <Field label="Kohlenhydrate g">
              <Input
                type="number"
                value={profile.carbGoal}
                onChange={(e) =>
                  updateProfile({ carbGoal: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Fett g">
              <Input
                type="number"
                value={profile.fatGoal}
                onChange={(e) =>
                  updateProfile({ fatGoal: Number(e.target.value) || 0 })
                }
              />
            </Field>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              updateProfile(suggested);
              toast.success("Ziele aus deinen Stats berechnet.");
            }}
          >
            Aus Stats berechnen
          </Button>
        </div>
      </section>

      {history.length > 0 ? (
        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <h2 className="font-heading text-base font-semibold">Gewicht</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {history.map((h) => (
              <li
                key={h.date}
                className="flex justify-between text-sm tabular-nums text-muted"
              >
                <span>
                  {new Date(h.date + "T12:00:00").toLocaleDateString("de-DE", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="text-fg">{fmt(h.bodyWeightKg ?? 0, 1)} kg</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-heading text-base font-semibold">Daten</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Alles bleibt auf diesem Gerät. Kein Konto, kein Server für den Plan.
          Essen und Sätze setzen sich jeden Tag um 0:00 zurück.
        </p>
        <Button
          className="mt-3"
          variant="danger"
          onClick={() => {
            resetToday(date);
            toast.success("Heutiges Log geleert.");
          }}
        >
          Heute zurücksetzen
        </Button>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

function Segment({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`h-9 rounded-sm text-sm font-medium ${
              value === o.id ? "bg-primary text-primary-fg" : "text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`h-9 rounded-full px-3 text-xs font-medium ${
            value === o.id
              ? "bg-primary text-primary-fg"
              : "bg-surface-2 text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
