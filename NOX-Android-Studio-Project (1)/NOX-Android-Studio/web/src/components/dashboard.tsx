import { Check, ChevronRight, Dumbbell, Utensils } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { InstallBanner } from "@/components/install-banner";
import { MacroRing } from "@/components/macro-ring";
import { Button } from "@/components/ui/button";
import { formatLongDate, greeting } from "@/lib/date";
import { countCompletedSets, remaining, setKey, sumFoods } from "@/lib/macros";
import { useAppStore } from "@/lib/store";
import type { DayLog, WorkoutDay } from "@/lib/types";
import { fmt } from "@/lib/utils";

type Props = { date: string; weekday: number };

export function Dashboard({ date, weekday }: Props) {
  const profile = useAppStore((s) => s.profile);
  const plan = useAppStore((s) => s.plan);
  const logs = useAppStore((s) => s.logs);
  const log = logs[date];
  const toggleSet = useAppStore((s) => s.toggleSet);
  const day = plan.find((d) => d.weekday === weekday);
  const eaten = sumFoods(log?.foods ?? []);
  const left = remaining(profile, eaten);
  const dayLog: DayLog = log ?? { date, foods: [], completedSets: {} };

  const totalSets =
    day && !day.rest
      ? day.exercises.reduce((n, e) => n + e.sets, 0)
      : 0;
  const doneSets =
    day && !day.rest
      ? day.exercises.reduce(
          (n, e) => n + countCompletedSets(dayLog, e.id, e.sets),
          0,
        )
      : 0;

  const weekDone = plan.filter((d) => {
    if (d.rest) return false;
    const key = dateForWeekday(date, weekday, d.weekday);
    const l = logs[key];
    return Boolean(l?.workoutDone) || allSetsDone(d, l);
  }).length;
  const weekTotal = plan.filter((d) => !d.rest).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-1">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {formatLongDate(date)}
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          {greeting()}, {profile.name}
        </h1>
      </header>

      <InstallBanner />

      <section className="rounded-xl bg-surface px-4 py-5 shadow-[var(--shadow-border)]">
        <div className="flex items-end justify-between px-1">
          <h2 className="font-heading text-base font-semibold">Heute noch</h2>
          <Link
            to="/"
            search={{ tab: "food" }}
            className="text-xs font-medium text-primary"
          >
            Essen loggen
          </Link>
        </div>
        <div className="mt-4 flex justify-around">
          <MacroRing
            label="Kalorien"
            remaining={left.kcal}
            goal={profile.calorieGoal}
            unit="kcal"
          />
          <MacroRing
            label="Protein"
            remaining={left.protein}
            goal={profile.proteinGoal}
            unit="g"
            tone="ok"
          />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <MiniStat
            label="Kohlenhydrate"
            value={`${fmt(Math.max(0, Math.round(left.carbs)))} g`}
            hint={`${fmt(Math.round(eaten.carbs))} / ${fmt(profile.carbGoal)}`}
          />
          <MiniStat
            label="Fett"
            value={`${fmt(Math.max(0, Math.round(left.fat)))} g`}
            hint={`${fmt(Math.round(eaten.fat))} / ${fmt(profile.fatGoal)}`}
          />
        </div>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Training
            </p>
            <h2 className="mt-0.5 font-heading text-lg font-semibold tracking-tight">
              {day ? `${day.name} ` : "Kein Plan"}
              {day && !day.rest ? (
                <span className="text-sm font-medium text-muted">
                  {doneSets}/{totalSets} Sätze
                </span>
              ) : null}
            </h2>
          </div>
          <Link
            to="/"
            search={{ tab: "plan" }}
            className="flex size-11 items-center justify-center rounded-md bg-surface-2 text-fg"
            aria-label="Zum Plan"
          >
            <ChevronRight className="size-5" />
          </Link>
        </div>

        {day?.rest || !day ? (
          <p className="mt-4 rounded-lg bg-surface-2 px-3 py-4 text-sm text-muted">
            Heute ist Pause. Regeneration zählt.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {day.exercises.slice(0, 4).map((ex) => {
              const done = countCompletedSets(dayLog, ex.id, ex.sets);
              return (
                <li
                  key={ex.id}
                  className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ex.name}</p>
                    <p className="text-xs text-muted tabular-nums">
                      {ex.sets} × {ex.reps}
                      {ex.weightKg > 0 ? ` · ${fmt(ex.weightKg, 1)} kg` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: ex.sets }).map((_, i) => {
                      const on = Boolean(dayLog.completedSets[setKey(ex.id, i)]);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleSet(date, ex.id, i)}
                          className={`size-9 rounded-sm text-[11px] font-semibold tabular-nums transition-colors ${
                            on
                              ? "bg-primary text-primary-fg"
                              : "bg-bg text-subtle"
                          }`}
                          aria-label={`Satz ${i + 1}`}
                        >
                          {on ? <Check className="mx-auto size-3.5" /> : i + 1}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
            {day.exercises.length > 4 ? (
              <p className="px-1 text-xs text-muted">
                +{day.exercises.length - 4} weitere Übungen
              </p>
            ) : null}
          </ul>
        )}
      </section>

      <p className="px-1 text-xs text-muted">
        Diese Woche {weekDone}/{weekTotal} Einheiten · Reset um 0:00
      </p>

      <div className="grid grid-cols-2 gap-2 pb-2">
        <Button asChild variant="secondary">
          <Link to="/" search={{ tab: "plan" }}>
            <Dumbbell className="size-4" />
            Plan
          </Link>
        </Button>
        <Button asChild>
          <Link to="/" search={{ tab: "food" }}>
            <Utensils className="size-4" />
            Essen
          </Link>
        </Button>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-3">
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-lg font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="text-xs text-subtle tabular-nums">{hint}</p>
    </div>
  );
}

function allSetsDone(day: WorkoutDay, log: DayLog | undefined) {
  if (!log || day.rest || day.exercises.length === 0) return false;
  return day.exercises.every(
    (e) => countCompletedSets(log, e.id, e.sets) >= e.sets,
  );
}

function dateForWeekday(today: string, todayWeekday: number, target: number) {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  let delta = target - todayWeekday;
  if (target === 0 && todayWeekday !== 0) delta = 7 - todayWeekday;
  if (todayWeekday === 0 && target !== 0) delta = target - 7;
  date.setDate(date.getDate() + delta);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
