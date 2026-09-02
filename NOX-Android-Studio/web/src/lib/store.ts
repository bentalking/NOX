import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_PLAN, DEFAULT_PROFILE } from "@/lib/defaults";
import { pruneDateKeys, todayKey } from "@/lib/date";
import type {
  DayLog,
  Exercise,
  FoodEntry,
  Profile,
  WorkoutDay,
} from "@/lib/types";
import { uid } from "@/lib/utils";

type AppState = {
  profile: Profile;
  plan: WorkoutDay[];
  logs: Record<string, DayLog>;
  installDismissed: boolean;
  updateProfile: (patch: Partial<Profile>) => void;
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      plan: DEFAULT_PLAN,
      logs: {},
      installDismissed: false,
      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),
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
        installDismissed: s.installDismissed,
      }),
    },
  ),
);

export function useTodayLog() {
  const date = todayKey();
  const logs = useAppStore((s) => s.logs);
  return logs[date] ?? emptyLog(date);
}
