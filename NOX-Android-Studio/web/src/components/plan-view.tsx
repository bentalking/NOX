import { Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEEKDAYS } from "@/lib/date";
import { countCompletedSets, setKey } from "@/lib/macros";
import { useAppStore } from "@/lib/store";
import type { Exercise, WorkoutDay } from "@/lib/types";

type Props = { date: string; weekday: number };

export function PlanView({ date, weekday }: Props) {
  const plan = useAppStore((s) => s.plan);
  const log = useAppStore((s) => s.logs[date]);
  const dayTemplates = useAppStore((s) => s.dayTemplates);
  const toggleSet = useAppStore((s) => s.toggleSet);
  const updateExercise = useAppStore((s) => s.updateExercise);
  const addExercise = useAppStore((s) => s.addExercise);
  const removeExercise = useAppStore((s) => s.removeExercise);
  const updateDay = useAppStore((s) => s.updateDay);
  const saveDayAsTemplate = useAppStore((s) => s.saveDayAsTemplate);
  const applyTemplateToDay = useAppStore((s) => s.applyTemplateToDay);
  const removeTemplate = useAppStore((s) => s.removeTemplate);
  const copyDayToDay = useAppStore((s) => s.copyDayToDay);
  const [selected, setSelected] = useState(weekday);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [dayOpen, setDayOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const day = plan.find((d) => d.weekday === selected) ?? plan[0];
  if (!day) return null;
  const isToday = selected === weekday;
  const dayLog = log ?? { date, foods: [], completedSets: {} };
  const totalSets = day.exercises.reduce((n, e) => n + e.sets, 0);
  const doneSets = day.exercises.reduce(
    (n, e) =>
      n +
      countCompletedSets(
        isToday ? dayLog : { date, foods: [], completedSets: {} },
        e.id,
        e.sets,
      ),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Trainingsplan
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          {day.name}
        </h1>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {WEEKDAYS.map((w) => {
          const d = plan.find((p) => p.weekday === w.id);
          const active = selected === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelected(w.id)}
              className={`flex min-w-11 flex-col items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-fg"
                  : w.id === weekday
                    ? "bg-surface-2 text-fg"
                    : "bg-surface text-muted"
              }`}
            >
              <span>{w.short}</span>
              <span className="mt-0.5 text-[10px] opacity-80">
                {d?.rest ? "—" : d?.name.slice(0, 4) ?? "—"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDayOpen(true)}
          className="flex h-10 items-center gap-2 rounded-md px-2 text-sm text-muted hover:text-fg"
        >
          <Pencil className="size-3.5" />
          Tag bearbeiten
        </button>
        {!day.rest && day.exercises.length > 0 ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => setCopyOpen(true)}>
              <Copy className="size-3.5" />
              Tag kopieren
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                saveDayAsTemplate(day.id, day.name);
                toast.success(`Vorlage „${day.name}" gespeichert`);
              }}
            >
              Als Vorlage
            </Button>
          </>
        ) : null}
      </div>

      {dayTemplates.length > 0 ? (
        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-sm font-semibold">Vorlagen</p>
          <p className="mt-0.5 text-xs text-muted">
            Tippe eine Vorlage, um sie auf den aktuellen Tag anzuwenden.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {dayTemplates.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left text-sm font-medium"
                  onClick={() => {
                    applyTemplateToDay(t.id, day.id);
                    toast.success(`„${t.name}" auf ${day.name} angewendet`);
                  }}
                >
                  {t.name}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {t.exercises.length} Übungen
                  </span>
                </button>
                <button
                  type="button"
                  className="size-9 text-subtle hover:text-danger"
                  aria-label="Vorlage löschen"
                  onClick={() => {
                    removeTemplate(t.id);
                    toast.success("Vorlage gelöscht");
                  }}
                >
                  <Trash2 className="mx-auto size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {day.rest ? (
        <div className="rounded-xl bg-surface px-4 py-8 text-center shadow-[var(--shadow-border)]">
          <p className="font-heading text-lg font-semibold">Ruhetag</p>
          <p className="mt-1 text-sm text-muted">
            Keine Einheit geplant. Übungen hinzufügen oder Vorlage anwenden.
          </p>
          <Button className="mt-4" onClick={() => addExercise(day.id)}>
            <Plus className="size-4" />
            Übung hinzufügen
          </Button>
        </div>
      ) : (
        <>
          {isToday ? (
            <p className="text-xs text-muted tabular-nums">
              {doneSets}/{totalSets} Sätze heute
            </p>
          ) : (
            <p className="text-xs text-muted">
              Gewichte und Sätze hier anpassen. Abhaken geht am Trainingstag.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {day.exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                interactive={isToday}
                completed={dayLog.completedSets}
                onToggle={(i) => toggleSet(date, ex.id, i)}
                onWeight={(kg) => updateExercise(day.id, ex.id, { weightKg: kg })}
                onEdit={() => setEditing(ex)}
              />
            ))}
          </ul>
          <Button variant="secondary" onClick={() => addExercise(day.id)}>
            <Plus className="size-4" />
            Übung hinzufügen
          </Button>
        </>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        {editing ? (
          <ExerciseDialog
            exercise={editing}
            onSave={(patch) => {
              updateExercise(day.id, editing.id, patch);
              setEditing(null);
            }}
            onDelete={() => {
              removeExercise(day.id, editing.id);
              setEditing(null);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={dayOpen} onOpenChange={setDayOpen}>
        <DayDialog
          day={day}
          onSave={(patch) => {
            updateDay(day.id, patch);
            setDayOpen(false);
          }}
        />
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent title="Tag kopieren">
          <p className="text-sm text-muted">
            Übungen von <strong className="text-fg">{day.name}</strong> auf einen
            anderen Wochentag kopieren.
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            {WEEKDAYS.filter((w) => w.id !== selected).map((w) => {
              const target = plan.find((p) => p.weekday === w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  className="flex h-11 items-center justify-between rounded-lg bg-surface-2 px-3.5 text-sm"
                  onClick={() => {
                    if (!target) return;
                    copyDayToDay(day.id, target.id);
                    setCopyOpen(false);
                    setSelected(w.id);
                    toast.success(`Nach ${w.label} kopiert`);
                  }}
                >
                  <span>
                    {w.label}
                    {target?.name ? ` · ${target.name}` : ""}
                  </span>
                  <Copy className="size-3.5 text-muted" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExerciseCard({
  exercise,
  interactive,
  completed,
  onToggle,
  onWeight,
  onEdit,
}: {
  exercise: Exercise;
  interactive: boolean;
  completed: Record<string, boolean>;
  onToggle: (i: number) => void;
  onWeight: (kg: number) => void;
  onEdit: () => void;
}) {
  return (
    <li className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{exercise.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {exercise.sets} Sätze × {exercise.reps}
            {exercise.notes ? ` · ${exercise.notes}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="relative size-9 rounded-sm text-subtle hover:bg-surface-2 hover:text-fg after:absolute after:inset-[-4px]"
          aria-label="Übung bearbeiten"
        >
          <Pencil className="mx-auto size-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Label htmlFor={`w-${exercise.id}`} className="shrink-0">
          kg
        </Label>
        <Input
          id={`w-${exercise.id}`}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={exercise.weightKg}
          onChange={(e) => onWeight(Number(e.target.value) || 0)}
          className="h-10 max-w-28 tabular-nums"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: exercise.sets }).map((_, i) => {
          const on = Boolean(completed[setKey(exercise.id, i)]);
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => onToggle(i)}
              className={`h-11 min-w-11 rounded-md text-sm font-semibold tabular-nums transition-colors ${
                on ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"
              } disabled:opacity-50`}
            >
              {on ? <Check className="mx-auto size-4" /> : i + 1}
            </button>
          );
        })}
      </div>
    </li>
  );
}

function ExerciseDialog({
  exercise,
  onSave,
  onDelete,
}: {
  exercise: Exercise;
  onSave: (patch: Partial<Exercise>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(exercise.name);
  const [sets, setSets] = useState(String(exercise.sets));
  const [reps, setReps] = useState(exercise.reps);
  const [weightKg, setWeightKg] = useState(String(exercise.weightKg));
  const [notes, setNotes] = useState(exercise.notes);

  return (
    <DialogContent title="Übung">
      <div className="flex flex-col gap-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Sätze">
            <Input type="number" min={1} max={12} value={sets} onChange={(e) => setSets(e.target.value)} />
          </Field>
          <Field label="Wdh.">
            <Input value={reps} onChange={(e) => setReps(e.target.value)} />
          </Field>
          <Field label="kg">
            <Input type="number" min={0} step={0.5} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </Field>
        </div>
        <Field label="Notiz">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
        </Field>
        <div className="mt-2 flex gap-2">
          <Button
            className="flex-1"
            onClick={() =>
              onSave({
                name: name.trim() || exercise.name,
                sets: Math.min(12, Math.max(1, Number(sets) || 1)),
                reps: reps.trim() || "10",
                weightKg: Number(weightKg) || 0,
                notes: notes.trim(),
              })
            }
          >
            Speichern
          </Button>
          <Button variant="danger" size="icon" onClick={onDelete} aria-label="Löschen">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function DayDialog({
  day,
  onSave,
}: {
  day: WorkoutDay;
  onSave: (patch: Partial<WorkoutDay>) => void;
}) {
  const [name, setName] = useState(day.name);
  const [rest, setRest] = useState(day.rest);
  return (
    <DialogContent title="Trainingstag">
      <div className="flex flex-col gap-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <button
          type="button"
          onClick={() => setRest((v) => !v)}
          className="flex h-11 items-center justify-between rounded-md bg-surface-2 px-3.5 text-sm"
        >
          <span>Ruhetag</span>
          <span className={rest ? "text-primary" : "text-muted"}>{rest ? "Ja" : "Nein"}</span>
        </button>
        <Button
          className="mt-2"
          onClick={() =>
            onSave({ name: name.trim() || day.name, rest, exercises: rest ? [] : day.exercises })
          }
        >
          Speichern
        </Button>
      </div>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
