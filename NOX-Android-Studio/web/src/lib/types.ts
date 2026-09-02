export type TabId = "home" | "plan" | "food" | "stats";

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very";

export type Goal = "cut" | "maintain" | "bulk";

export type Profile = {
  name: string;
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: Goal;
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
};

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weightKg: number;
  notes: string;
};

export type WorkoutDay = {
  id: string;
  weekday: number;
  name: string;
  rest: boolean;
  exercises: Exercise[];
};

export type FoodEntry = {
  id: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "local" | "manual" | "ai" | "photo";
  createdAt: number;
};

export type DayLog = {
  date: string;
  foods: FoodEntry[];
  completedSets: Record<string, boolean>;
  bodyWeightKg?: number;
  workoutDone?: boolean;
};

export type FoodItem = {
  name: string;
  aliases: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  pieceGrams?: number;
};
