import type { DayLog, FoodEntry, Profile } from "@/lib/types";

export type MacroTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const ZERO_MACROS: MacroTotals = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

export function sumFoods(foods: FoodEntry[]): MacroTotals {
  return foods.reduce(
    (acc, f) => ({
      kcal: acc.kcal + f.kcal,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }),
    ZERO_MACROS,
  );
}

export function remaining(profile: Profile, eaten: MacroTotals): MacroTotals {
  return {
    kcal: profile.calorieGoal - eaten.kcal,
    protein: profile.proteinGoal - eaten.protein,
    carbs: profile.carbGoal - eaten.carbs,
    fat: profile.fatGoal - eaten.fat,
  };
}

export function setKey(exerciseId: string, setIndex: number) {
  return `${exerciseId}:${setIndex}`;
}

export function countCompletedSets(log: DayLog, exerciseId: string, sets: number) {
  let n = 0;
  for (let i = 0; i < sets; i++) {
    if (log.completedSets[setKey(exerciseId, i)]) n += 1;
  }
  return n;
}
