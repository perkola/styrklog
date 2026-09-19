import { resolveExercise } from './exerciseMuscleMap';
import {
  MUSCLES,
  type Aggregation,
  type ExerciseTally,
  type Muscle,
  type MuscleContribution,
  type MuscleExerciseTally,
  type MuscleStat,
  type SetRow,
  type WindowKey,
} from './types';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export const WINDOW_LABELS: Record<WindowKey, string> = {
  '1w': '1 week',
  '1m': '1 month',
  ytd: 'This year',
  '1y': '1 year',
};

/**
 * Step back `months` calendar months, clamping the day of month.
 *
 * Plain setMonth overflows — 31 March minus one month lands in early March,
 * because 31 February does not exist — which would silently widen the window.
 */
function monthsBefore(ms: number, months: number): number {
  const d = new Date(ms);
  const day = d.getDate();
  d.setMonth(d.getMonth() - months);
  if (d.getDate() !== day) d.setDate(0);
  return d.getTime();
}

/**
 * Where a window starts, counting back from the file's most recent workout.
 *
 * Three of these are fixed look-back intervals. `ytd` is the odd one out: it
 * runs from 1 January of the anchor's year, so its length depends on when in
 * the year you are looking.
 */
function windowStartFor(anchor: number, window: WindowKey): number {
  switch (window) {
    case '1w':
      return anchor - 7 * 24 * 60 * 60 * 1000;
    case '1m':
      return monthsBefore(anchor, 1);
    case '1y':
      return monthsBefore(anchor, 12);
    case 'ytd': {
      const d = new Date(anchor);
      return new Date(d.getFullYear(), 0, 1).getTime();
    }
  }
}

/**
 * A set counts toward volume when it isn't a warm-up and represents actual
 * work — reps, a timed hold, or a distance. Everything else is skipped.
 */
function isWorkingSet(set: SetRow): boolean {
  if (set.isWarmup) return false;
  return (
    (set.reps != null && set.reps > 0) ||
    (set.timeSec != null && set.timeSec > 0) ||
    (set.distanceM != null && set.distanceM > 0)
  );
}

function emptyStat(muscle: Muscle): MuscleStat {
  return { muscle, setsPerWeek: 0, totalSets: 0, exercises: [] };
}

/**
 * Reduce sets to per-muscle weekly volume over a window.
 *
 * The window is anchored to the most recent workout **in the file**, not to
 * today. An export sitting a few months old would otherwise render an empty
 * map, which looks like a bug rather than like stale data.
 */
export function aggregate(sets: SetRow[], window: WindowKey): Aggregation {
  const anchor = sets.reduce((max, s) => Math.max(max, s.workoutStart), 0);
  const earliest = sets.reduce(
    (min, s) => Math.min(min, s.workoutStart),
    Number.POSITIVE_INFINITY,
  );

  const windowStart = windowStartFor(anchor, window);
  const nominalWeeks = (anchor - windowStart) / MS_PER_WEEK;

  // Don't divide by weeks that predate the first workout ever logged: a
  // two-week-old export viewed at "1 year" would otherwise read as though
  // fifty weeks of training had been skipped.
  const dataSpanWeeks = Math.max(1, (anchor - earliest) / MS_PER_WEEK);
  const weeks = Math.max(1, Math.min(nominalWeeks, dataSpanWeeks));

  const inWindow = sets.filter((s) => s.workoutStart >= windowStart);
  const workouts = new Set(inWindow.map((s) => s.workoutStart)).size;

  const byMuscle = Object.fromEntries(
    MUSCLES.map((m) => [m, emptyStat(m)]),
  ) as Record<Muscle, MuscleStat>;

  // muscle -> exercise -> { sets, contribution }
  const perMuscleExercise = new Map<Muscle, Map<string, MuscleExerciseTally>>();
  const unmapped = new Map<string, number>();
  const inferred = new Map<
    string,
    { sets: number; contributions: MuscleContribution[] }
  >();

  let workingSets = 0;

  for (const set of inWindow) {
    if (!isWorkingSet(set)) continue;
    workingSets++;

    const resolution = resolveExercise(set.exercise);
    if (!resolution) {
      unmapped.set(set.exercise, (unmapped.get(set.exercise) ?? 0) + 1);
      continue;
    }

    if (resolution.inferred) {
      const existing = inferred.get(set.exercise);
      if (existing) existing.sets++;
      else
        inferred.set(set.exercise, {
          sets: 1,
          contributions: resolution.contributions,
        });
    }

    for (const { muscle, weight } of resolution.contributions) {
      byMuscle[muscle].totalSets += weight;

      let tallies = perMuscleExercise.get(muscle);
      if (!tallies) {
        tallies = new Map();
        perMuscleExercise.set(muscle, tallies);
      }
      const tally = tallies.get(set.exercise);
      if (tally) {
        tally.sets++;
        tally.weightedSets += weight;
      } else {
        tallies.set(set.exercise, {
          exercise: set.exercise,
          sets: 1,
          contribution: weight,
          weightedSets: weight,
        });
      }
    }
  }

  for (const muscle of MUSCLES) {
    const stat = byMuscle[muscle];
    stat.setsPerWeek = stat.totalSets / weeks;
    stat.exercises = [...(perMuscleExercise.get(muscle)?.values() ?? [])].sort(
      (a, b) => b.weightedSets - a.weightedSets,
    );
  }

  const ranked = [...MUSCLES]
    .map((m) => byMuscle[m])
    .sort((a, b) => b.setsPerWeek - a.setsPerWeek);

  const toTallies = (counts: Map<string, number>): ExerciseTally[] =>
    [...counts.entries()]
      .map(([exercise, count]) => ({ exercise, sets: count }))
      .sort((a, b) => b.sets - a.sets);

  return {
    anchor,
    windowStart,
    weeks,
    workouts,
    workingSets,
    byMuscle,
    ranked,
    maxSetsPerWeek: ranked[0]?.setsPerWeek ?? 0,
    unmapped: toTallies(unmapped),
    inferred: [...inferred.entries()]
      .map(([exercise, v]) => ({
        exercise,
        sets: v.sets,
        contributions: v.contributions,
      }))
      .sort((a, b) => b.sets - a.sets),
  };
}
