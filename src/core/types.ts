/**
 * Core domain types. Nothing in this directory may import from `react-native`:
 * the whole pipeline has to stay runnable (and testable) under plain Node.
 */

/** One logged set, as exported by StrengthLog. */
export type SetRow = {
  workoutName: string;
  /** Epoch ms of the workout's start. Doubles as the workout's identity. */
  workoutStart: number;
  workoutEnd: number;
  exercise: string;
  weightKg: number | null;
  bodyweightKg: number | null;
  assistingWeightKg: number | null;
  extraWeightKg: number | null;
  /** `height` column, in metres as exported (box-step height). */
  height: number | null;
  reps: number | null;
  /** `time` column ("00:10:00") converted to seconds. */
  timeSec: number | null;
  /** `distanceKM` and `distanceM` normalised to metres. */
  distanceM: number | null;
  isWarmup: boolean;
  isFailure: boolean;
  /**
   * Cardio-machine calories. The export has TWO columns named `calories`;
   * this is the first (set-level). The second is a daily wellness score and
   * is deliberately not carried here — see parseCsv.ts.
   */
  caloriesBurned: number | null;
};

/**
 * Our muscle taxonomy. Deliberately finer-grained than the slugs
 * react-native-body-highlighter exposes; see bodySlugs.ts for the projection.
 */
export const MUSCLES = [
  'chest',
  'front-delts',
  'side-delts',
  'rear-delts',
  'lats',
  'upper-back',
  'traps',
  'lower-back',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'calves',
  'tibialis',
] as const;

export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest',
  'front-delts': 'Front delts',
  'side-delts': 'Side delts',
  'rear-delts': 'Rear delts',
  lats: 'Lats',
  'upper-back': 'Upper back',
  traps: 'Traps',
  'lower-back': 'Lower back',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  adductors: 'Adductors',
  calves: 'Calves',
  tibialis: 'Tibialis',
};

/** How much one set of an exercise counts toward a muscle. 1 = primary, 0.5 = secondary. */
export type MuscleContribution = { muscle: Muscle; weight: number };

export type Resolution = {
  contributions: MuscleContribution[];
  /** True when matched by keyword heuristic rather than the explicit table. */
  inferred: boolean;
};

export type ExerciseTally = { exercise: string; sets: number };

/** An exercise's contribution to one specific muscle, for the drill-down. */
export type MuscleExerciseTally = ExerciseTally & {
  /** 1 = primary mover, 0.5 = secondary. */
  contribution: number;
  /** sets x contribution — what actually feeds setsPerWeek. */
  weightedSets: number;
};

export type MuscleStat = {
  muscle: Muscle;
  /** Fractional sets per week over the selected window. The headline number. */
  setsPerWeek: number;
  /** Weighted set count inside the window, before dividing by weeks. */
  totalSets: number;
  /** Which exercises fed this muscle, heaviest contributor first. */
  exercises: MuscleExerciseTally[];
};

export type WindowKey = '4w' | '8w' | '12w' | 'all';

export type Aggregation = {
  /** Epoch ms of the most recent workout in the file. All windows count back from here. */
  anchor: number;
  windowStart: number;
  /** Divisor used for the per-week figures. Never below 1. */
  weeks: number;
  workouts: number;
  /** Non-warm-up rows inside the window. */
  workingSets: number;
  byMuscle: Record<Muscle, MuscleStat>;
  /** byMuscle sorted by setsPerWeek, descending. */
  ranked: MuscleStat[];
  maxSetsPerWeek: number;
  /** Exercises present in the window that the mapping table does not cover at all. */
  unmapped: ExerciseTally[];
  /** Exercises matched only by keyword heuristic — shown so guesses stay auditable. */
  inferred: (ExerciseTally & { contributions: MuscleContribution[] })[];
};
