import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCENT_PRESETS, calcTdee, suggestedGoals } from "@/lib/defaults";
import { useAppStore } from "@/lib/store";
import type { AccentColor, ActivityLevel, Goal, Sex, ThemeMode } from "@/lib/types";
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

const ACCENTS = (Object.keys(ACCENT_PRESETS) as AccentColor[]).map((id) => ({
  id,
  label: ACCENT_PRESETS[id].label,
  color: ACCENT_PRESETS[id].primary,
}));

function formatBackupDate(ts: number) {
  return new Date(ts).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StatsView({ date }: Props) {
  const profile = useAppStore((s) => s.profile);
  const deepseekKey = useAppStore((s) => s.deepseekKey);
  const setDeepseekKey = useAppStore((s) => s.setDeepseekKey);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const logBodyWeight = useAppStore((s) => s.logBodyWeight);
  const resetToday = useAppStore((s) => s.resetToday);
  const savedBackups = useAppStore((s) => s.savedBackups);
  const saveNamedBackup = useAppStore((s) => s.saveNamedBackup);
  const restoreNamedBackup = useAppStore((s) => s.restoreNamedBackup);
  const removeNamedBackup = useAppStore((s) => s.removeNamedBackup);
  const logs = useAppStore((s) => s.logs);
  const [weight, setWeight] = useState(String(profile.weightKg));
  const [keyDraft, setKeyDraft] = useState(deepseekKey);
  const [backupName, setBackupName] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const tdee = calcTdee(profile);
  const suggested = suggestedGoals(profile);
  const theme = profile.theme ?? "dark";

  const history = Object.values(logs)
    .filter((l) => l.bodyWeightKg)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  const selected = savedBackups.find((b) => b.id === selectedId) ?? null;

  function doSave() {
    const name = backupName.trim() || `Stand ${formatBackupDate(Date.now())}`;
    saveNamedBackup(name);
    setBackupName("");
    toast.success(`Gespeichert: ${name}`);
  }

  function doRestore() {
    if (!selectedId) {
      toast.error("Bitte ein Backup auswählen");
      return;
    }
    restoreNamedBackup(selectedId);
    toast.success(selected ? `Wiederhergestellt: ${selected.name}` : "Wiederhergestellt");
  }

  function doDelete() {
    if (!selectedId) return;
    const name = selected?.name ?? "Backup";
    removeNamedBackup(selectedId);
    setSelectedId("");
    toast.success(`Gelöscht: ${name}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Werte</p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">Deine Stats</h1>
      </header>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-heading text-base font-semibold">Erscheinung</h2>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
          {(["dark", "light"] as ThemeMode[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => updateProfile({ theme: t })}
              className={`h-10 rounded-sm text-sm font-medium ${
                theme === t ? "bg-primary text-primary-fg" : "text-muted"
              }`}
            >
              {t === "dark" ? "Dunkel" : "Hell"}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ACCENTS.map((a) => {
            const active = (profile.accent ?? "white") === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => updateProfile({ accent: a.id })}
                className={`flex h-10 items-center gap-2 rounded-full px-3 text-xs font-medium ${
                  active ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"
                }`}
              >
                <span className="size-3.5 rounded-full ring-1 ring-white/20" style={{ background: a.color }} />
                {a.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-heading text-base font-semibold">Profil</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Name">
            <Input value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Segment
              label="Geschlecht"
              value={profile.sex}
              options={[{ id: "male", label: "Mann" }, { id: "female", label: "Frau" }]}
              onChange={(sex) => updateProfile({ sex: sex as Sex })}
            />
            <Field label="Alter">
              <Input type="number" min={14} max={90} value={profile.age}
                onChange={(e) => updateProfile({ age: Number(e.target.value) || profile.age })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Größe cm">
              <Input type="number" min={120} max={230} value={profile.heightCm}
                onChange={(e) => updateProfile({ heightCm: Number(e.target.value) || profile.heightCm })} />
            </Field>
            <Field label="Gewicht kg">
              <Input type="number" min={40} max={250} step={0.1} value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onBlur={() => { const kg = Number(weight); if (kg > 0) logBodyWeight(date, kg); }} />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-heading text-base font-semibold">Essen-Erkennung</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">Optionaler API-Key nur für Foto. Alltag offline.</p>
        <div className="mt-3 flex flex-col gap-2">
          <Field label="OpenAI / DeepSeek Key">
            <Input type="password" autoComplete="off" placeholder="sk-…" value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setDeepseekKey(keyDraft.trim()); toast.success(keyDraft.trim() ? "Key gespeichert." : "Key entfernt."); }}>Speichern</Button>
            {deepseekKey ? (<Button variant="ghost" onClick={() => { setKeyDraft(""); setDeepseekKey(""); toast.success("Key gelöscht."); }}>Löschen</Button>) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-heading text-base font-semibold">Tagesziele</h2>
        <p className="mt-1 text-xs text-muted">Grundumsatz + Alltag ≈ {fmt(tdee)} kcal.</p>
        <div className="mt-3 flex flex-col gap-3">
          <ChipRow value={profile.activity} options={ACTIVITY} onChange={(activity) => updateProfile({ activity: activity as ActivityLevel })} />
          <ChipRow value={profile.goal} options={GOALS} onChange={(goal) => updateProfile({ goal: goal as Goal })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="kcal"><Input type="number" value={profile.calorieGoal} onChange={(e) => updateProfile({ calorieGoal: Number(e.target.value) || 0 })} /></Field>
            <Field label="Protein g"><Input type="number" value={profile.proteinGoal} onChange={(e) => updateProfile({ proteinGoal: Number(e.target.value) || 0 })} /></Field>
            <Field label="Kohlenhydrate g"><Input type="number" value={profile.carbGoal} onChange={(e) => updateProfile({ carbGoal: Number(e.target.value) || 0 })} /></Field>
            <Field label="Fett g"><Input type="number" value={profile.fatGoal} onChange={(e) => updateProfile({ fatGoal: Number(e.target.value) || 0 })} /></Field>
          </div>
          <Button variant="secondary" onClick={() => { updateProfile(suggested); toast.success("Ziele berechnet."); }}>Aus Stats berechnen</Button>
        </div>
      </section>

      {history.length > 0 ? (
        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <h2 className="font-heading text-base font-semibold">Gewicht</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.date} className="flex justify-between text-sm tabular-nums text-muted">
                <span>{new Date(h.date + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>
                <span className="text-fg">{fmt(h.bodyWeightKg ?? 0, 1)} kg</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-heading text-base font-semibold">Backups</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Name vergeben, speichern, später aus der Liste wiederherstellen – alles in der App, kein Dateisystem-Suchspiel.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Field label="Name für neues Backup">
            <Input value={backupName} onChange={(e) => setBackupName(e.target.value)} placeholder="z.B. Vor Diät, Stand Montag…" />
          </Field>
          <Button onClick={doSave}>Speichern</Button>
        </div>
        <div className="mt-4">
          <Label>Gespeicherte Backups</Label>
          {savedBackups.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Noch keine Backups.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <select
                className="h-11 w-full rounded-md border-0 bg-surface-2 px-3 text-sm text-fg outline-none ring-1 ring-border"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">— auswählen —</option>
                {savedBackups.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} · {formatBackupDate(b.createdAt)}</option>
                ))}
              </select>
              {selected ? (
                <p className="text-xs text-muted">{selected.name} · {formatBackupDate(selected.createdAt)} · Plan + Logs + Vorlagen</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={doRestore} disabled={!selectedId}>Wiederherstellen</Button>
                <Button variant="ghost" onClick={doDelete} disabled={!selectedId}>Löschen</Button>
              </div>
            </div>
          )}
        </div>
        <Button className="mt-4" variant="danger" onClick={() => { resetToday(date); toast.success("Heutiges Log geleert."); }}>Heute zurücksetzen</Button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (<label className="flex flex-col gap-1.5"><Label>{label}</Label>{children}</label>);
}

function Segment({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (id: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
        {options.map((o) => (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            className={`h-9 rounded-sm text-sm font-medium ${value === o.id ? "bg-primary text-primary-fg" : "text-muted"}`}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function ChipRow({ value, options, onChange }: { value: string; options: { id: string; label: string }[]; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`h-9 rounded-full px-3 text-xs font-medium ${value === o.id ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"}`}>{o.label}</button>
      ))}
    </div>
  );
}
