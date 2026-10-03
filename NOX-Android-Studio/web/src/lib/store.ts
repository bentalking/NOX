import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_PLAN, DEFAULT_PROFILE } from "@/lib/defaults";
import { pruneDateKeys, todayKey } from "@/lib/date";
import type {
  DayLog,
  DayTemplate,
  Exercise,
  FoodEntry,
  NoxBackup,
  Profile,
  WorkoutDay,
} from "@/lib/types";
import { uid } from "@/lib/utils";

type AppState = {
  profile: Profile;
  plan: WorkoutDay[];
  logs: Record<string, DayLog>;
  dayTemplates: DayTemplate[];
  installDismissed: boolean;
  deepseekKey: string;
  updateProfile: (patch: Partial<Profile>) => void;
  setDeepseekKey: (key: string) => void;
  setPlan: (plan: WorkoutDay[]) => void;
  updateDay: (dayId: string, patch: Partial<WorkoutDay>) => void;
  addExercise: (dayId: string, exercise?: Partial<Exercise>) => void;
  updateExercise: (
    dayId: string,
    exerciseId: string,
    patch: Partial<Exercise>,
  ) => void;
  removeExercise: (dayId: string, exerciseId: string) => void;
  ensureLog: (date: string) => DayLog;
  addFood: (date: string, food: Omit<FoodEntry, "id" | "createdAt">) => void;
  removeFood: (date: string, foodId: string) => void;
  toggleSet: (date: string, exerciseId: string, setIndex: number) => void;
  setWorkoutDone: (date: string, done: boolean) => void;
  logBodyWeight: (date: string, kg: number) => void;
  dismissInstall: () => void;
  resetToday: (date: string) => void;
  saveDayAsTemplate: (dayId: string, name?: string) => void;
  applyTemplateToDay: (templateId: string, dayId: string) => void;
  removeTemplate: (templateId: string) => void;
  exportBackup: () => NoxBackup;
  importBackup: (data: NoxBackup, opts?: { includeKey?: boolean }) => void;
};

function emptyLog(date: string): DayLog {
  return { date, foods: [], completedSets: {} };
}

function pruneLogs(logs: Record<string, DayLog>): Record<string, DayLog> {
  const keep = pruneDateKeys(Object.keys(logs));
  const next: Record<string, DayLog> = {};
  for (const key of keep) {
    const log = logs[key];
    if (log) next[key] = log;
  }
  return next;
}

function migrateProfile(raw: Partial<Profile> | undefined): Profile {
  return {
    ...DEFAULT_PROFILE,
    ...(raw ?? {}),
    accent: raw?.accent ?? DEFAULT_PROFILE.accent,
    theme: raw?.theme === "light" ? "light" : "dark",
  };
}

function cloneExercises(exercises: Exercise[]): Exercise[] {
  return exercises.map((e) => ({
    ...e,
    id: uid("ex"),
  }));
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      plan: DEFAULT_PLAN,
      logs: {},
      dayTemplates: [],
      installDismissed: true,
      deepseekKey: "",
      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),
      setDeepseekKey: (key) => set({ deepseekKey: key }),
      setPlan: (plan) => set({ plan }),
      updateDay: (dayId, patch) =>
        set((s) => ({
          plan: s.plan.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
        })),
      addExercise: (dayId, exercise) =>
        set((s) => ({
          plan: s.plan.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  rest: false,
                  exercises: [
                    ...d.exercises,
                    {
                      id: uid("ex"),
                      name: exercise?.name ?? "Neue Übung",
                      sets: exercise?.sets ?? 3,
                      reps: exercise?.reps ?? "10",
                      weightKg: exercise?.weightKg ?? 0,
                      notes: exercise?.notes ?? "",
                    },
                  ],
                }
              : d,
          ),
        })),
      updateExercise: (dayId, exerciseId, patch) =>
        set((s) => ({
          plan: s.plan.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  exercises: d.exercises.map((e) =>
                    e.id === exerciseId ? { ...e, ...patch } : e,
                  ),
                }
              : d,
          ),
        })),
      removeExercise: (dayId, exerciseId) =>
        set((s) => ({
          plan: s.plan.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  exercises: d.exercises.filter((e) => e.id !== exerciseId),
                }
              : d,
          ),
        })),
      ensureLog: (date) => {
        const existing = get().logs[date];
        if (existing) return existing;
        const log = emptyLog(date);
        set((s) => ({ logs: pruneLogs({ ...s.logs, [date]: log }) }));
        return log;
      },
      addFood: (date, food) =>
        set((s) => {
          const log = s.logs[date] ?? emptyLog(date);
          const entry: FoodEntry = {
            ...food,
            id: uid("food"),
            createdAt: Date.now(),
          };
          return {
            logs: pruneLogs({
              ...s.logs,
              [date]: { ...log, foods: [entry, ...log.foods] },
            }),
          };
        }),
      removeFood: (date, foodId) =>
        set((s) => {
          const log = s.logs[date];
          if (!log) return s;
          return {
            logs: {
              ...s.logs,
              [date]: {
                ...log,
                foods: log.foods.filter((f) => f.id !== foodId),
              },
            },
          };
        }),
      toggleSet: (date, exerciseId, setIndex) =>
        set((s) => {
          const log = s.logs[date] ?? emptyLog(date);
          const key = `${exerciseId}:${setIndex}`;
          const completedSets = { ...log.completedSets };
          if (completedSets[key]) delete completedSets[key];
          else completedSets[key] = true;
          return {
            logs: pruneLogs({ ...s.logs, [date]: { ...log, completedSets } }),
          };
        }),
      setWorkoutDone: (date, done) =>
        set((s) => {
          const log = s.logs[date] ?? emptyLog(date);
          return {
            logs: pruneLogs({
              ...s.logs,
              [date]: { ...log, workoutDone: done },
            }),
          };
        }),
      logBodyWeight: (date, kg) =>
        set((s) => {
          const log = s.logs[date] ?? emptyLog(date);
          return {
            logs: pruneLogs({
              ...s.logs,
              [date]: { ...log, bodyWeightKg: kg },
            }),
            profile: { ...s.profile, weightKg: kg },
          };
        }),
      dismissInstall: () => set({ installDismissed: true }),
      resetToday: (date) =>
        set((s) => ({
          logs: { ...s.logs, [date]: emptyLog(date) },
        })),
      saveDayAsTemplate: (dayId, name) =>
        set((s) => {
          const day = s.plan.find((d) => d.id === dayId);
          if (!day || day.rest || day.exercises.length === 0) return s;
          const template: DayTemplate = {
            id: uid("tpl"),
            name: name?.trim() || day.name || "Vorlage",
            exercises: cloneExercises(day.exercises),
            createdAt: Date.now(),
          };
          return { dayTemplates: [template, ...s.dayTemplates] };
        }),
      applyTemplateToDay: (templateId, dayId) =>
        set((s) => {
          const tpl = s.dayTemplates.find((t) => t.id === templateId);
          if (!tpl) return s;
          return {
            plan: s.plan.map((d) =>
              d.id === dayId
                ? {
                    ...d,
                    rest: false,
                    exercises: cloneExercises(tpl.exercises),
                  }
                : d,
            ),
          };
        }),
      removeTemplate: (templateId) =>
        set((s) => ({
          dayTemplates: s.dayTemplates.filter((t) => t.id !== templateId),
        })),
      exportBackup: () => {
        const s = get();
        return {
          version: 1 as const,
          exportedAt: new Date().toISOString(),
          profile: s.profile,
          plan: s.plan,
          logs: s.logs,
          dayTemplates: s.dayTemplates,
          deepseekKey: s.deepseekKey || undefined,
        };
      },
      importBackup: (data, opts) => {
        if (!data || data.version !== 1) return;
        set((s) => ({
          profile: migrateProfile(data.profile),
          plan: Array.isArray(data.plan) ? data.plan : s.plan,
          logs: data.logs && typeof data.logs === "object" ? data.logs : s.logs,
          dayTemplates: Array.isArray(data.dayTemplates)
            ? data.dayTemplates
            : s.dayTemplates,
          deepseekKey:
            opts?.includeKey && typeof data.deepseekKey === "string"
              ? data.deepseekKey
              : s.deepseekKey,
        }));
      },
    }),
    {
      name: "nox-app-v1",
      storage:
        typeof window === "undefined"
          ? undefined
          : createJSONStorage(() => localStorage),
      partialize: (s) => ({
        profile: s.profile,
        plan: s.plan,
        logs: s.logs,
        dayTemplates: s.dayTemplates,
        installDismissed: true,
        deepseekKey: s.deepseekKey,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          profile: migrateProfile(p.profile),
          dayTemplates: Array.isArray(p.dayTemplates) ? p.dayTemplates : [],
          installDismissed: true,
          deepseekKey: typeof p.deepseekKey === "string" ? p.deepseekKey : "",
        };
      },
    },
  ),
);

export function useTodayLog() {
  const date = todayKey();
  const logs = useAppStore((s) => s.logs);
  return logs[date] ?? emptyLog(date);
}
