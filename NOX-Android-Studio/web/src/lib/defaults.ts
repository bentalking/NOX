import type { Exercise, Profile, WorkoutDay } from "@/lib/types";

export const DEFAULT_PROFILE: Profile = {
  name: "Athlet",
  sex: "male",
  age: 25,
  weightKg: 80,
  heightCm: 180,
  activity: "moderate",
  goal: "maintain",
  calorieGoal: 2500,
  proteinGoal: 180,
  carbGoal: 250,
  fatGoal: 70,
};

function ex(
  id: string,
  name: string,
  sets: number,
  reps: string,
  weightKg: number,
  notes = "",
): Exercise {
  return { id, name, sets, reps, weightKg, notes };
}

export const DEFAULT_PLAN: WorkoutDay[] = [
  {
    id: "day-push",
    weekday: 1,
    name: "Push",
    rest: false,
    exercises: [
      ex("push-bench", "Bankdrücken", 4, "6–8", 60),
      ex("push-incline", "Schrägbank Kurzhantel", 3, "8–10", 24),
      ex("push-ohp", "Schulterdrücken", 4, "8–10", 30),
      ex("push-lateral", "Seitheben", 3, "12–15", 10),
      ex("push-fly", "Cable Flys", 3, "12–15", 15),
      ex("push-tri", "Trizeps Pushdown", 3, "10–12", 25),
      ex("push-dips", "Dips", 3, "8–12", 0, "Körpergewicht"),
    ],
  },
  {
    id: "day-pull",
    weekday: 2,
    name: "Pull",
    rest: false,
    exercises: [
      ex("pull-chin", "Klimmzüge", 4, "6–10", 0, "Körpergewicht"),
      ex("pull-row", "Langhantelrudern", 4, "8–10", 50),
      ex("pull-lat", "Latzug", 3, "10–12", 45),
      ex("pull-face", "Face Pulls", 3, "12–15", 15),
      ex("pull-curl", "Langhantelcurls", 3, "8–12", 25),
      ex("pull-hammer", "Hammercurls", 3, "10–12", 12),
    ],
  },
  {
    id: "day-rest-1",
    weekday: 3,
    name: "Pause",
    rest: true,
    exercises: [],
  },
  {
    id: "day-legs",
    weekday: 4,
    name: "Beine",
    rest: false,
    exercises: [
      ex("legs-squat", "Kniebeugen", 4, "6–8", 80),
      ex("legs-rdl", "Rumänisches Kreuzheben", 3, "8–10", 70),
      ex("legs-press", "Beinpresse", 3, "10–12", 120),
      ex("legs-curl", "Beinbeuger", 3, "10–12", 40),
      ex("legs-ext", "Beinstrecker", 3, "12–15", 40),
      ex("legs-calf", "Wadenheben", 4, "12–15", 80),
    ],
  },
  {
    id: "day-upper",
    weekday: 5,
    name: "Oberkörper",
    rest: false,
    exercises: [
      ex("upper-bench", "Bankdrücken", 3, "8–10", 55),
      ex("upper-row", "Sitzendes Rudern", 3, "8–10", 50),
      ex("upper-ohp", "Schulterdrücken", 3, "8–10", 28),
      ex("upper-lat", "Latzug eng", 3, "10–12", 40),
      ex("upper-lat-raise", "Seitheben", 3, "12–15", 10),
      ex("upper-curl", "Bizepscurls", 3, "10–12", 12),
      ex("upper-tri", "Überkopf-Trizeps", 3, "10–12", 20),
    ],
  },
  {
    id: "day-rest-2",
    weekday: 6,
    name: "Pause",
    rest: true,
    exercises: [],
  },
  {
    id: "day-rest-3",
    weekday: 0,
    name: "Pause",
    rest: true,
    exercises: [],
  },
];

const ACTIVITY_FACTOR: Record<Profile["activity"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very: 1.9,
};

const GOAL_DELTA: Record<Profile["goal"], number> = {
  cut: -400,
  maintain: 0,
  bulk: 300,
};

export function calcTdee(profile: Profile): number {
  const bmr =
    10 * profile.weightKg +
    6.25 * profile.heightCm -
    5 * profile.age +
    (profile.sex === "male" ? 5 : -161);
  return Math.round(bmr * ACTIVITY_FACTOR[profile.activity]);
}

export function suggestedGoals(profile: Profile): {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
} {
  const tdee = calcTdee(profile);
  const calorieGoal = Math.max(1400, tdee + GOAL_DELTA[profile.goal]);
  const proteinGoal = Math.round(profile.weightKg * 2);
  const fatGoal = Math.round((calorieGoal * 0.25) / 9);
  const carbGoal = Math.max(
    80,
    Math.round((calorieGoal - proteinGoal * 4 - fatGoal * 9) / 4),
  );
  return { calorieGoal, proteinGoal, carbGoal, fatGoal };
}
