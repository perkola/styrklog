import { aggregate } from '../aggregate';
import { parseStrengthLogCsv } from '../parseCsv';
import type { SetRow } from '../types';
import { SAMPLE_CSV } from './fixture';

const sets = parseStrengthLogCsv(SAMPLE_CSV);

describe('aggregate', () => {
  describe('windowing', () => {
    it('anchors to the last workout in the file, not to today', () => {
      // The fixture ends 2026-06-30. Anchoring to Date.now() would render an
      // empty map for any export more than a few weeks old.
      const a = aggregate(sets, '1m');
      expect(new Date(a.anchor).toISOString().slice(0, 10)).toBe('2026-06-30');
      expect(a.anchor).toBeLessThan(Date.now());
    });

    it.each([
      ['1w', 2, 12],
      ['1m', 4, 22],
      ['ytd', 7, 30],
      ['1y', 7, 30],
    ] as const)('%s selects %i workouts and %i working sets', (key, workouts, working) => {
      const a = aggregate(sets, key);
      expect(a.workouts).toBe(workouts);
      expect(a.workingSets).toBe(working);
    });

    it('counts a fixed week back from the anchor', () => {
      const a = aggregate(sets, '1w');
      expect(new Date(a.windowStart).toISOString().slice(0, 10)).toBe('2026-06-23');
      expect(a.weeks).toBe(1);
    });

    it('counts a calendar month back, not thirty days', () => {
      const a = aggregate(sets, '1m');
      // 28-31 days depending on the month, so assert the range rather than a
      // magic number that would break under a different anchor or timezone.
      const days = (a.anchor - a.windowStart) / 86_400_000;
      expect(days).toBeGreaterThanOrEqual(28);
      expect(days).toBeLessThanOrEqual(31);
      expect(a.weeks).toBeCloseTo(days / 7, 6);
    });

    it('starts "this year" at 1 January of the anchor year', () => {
      const a = aggregate(sets, 'ytd');
      const d = new Date(a.windowStart);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(1);
    });

    it('never divides by weeks that predate the first workout', () => {
      // The fixture spans ~17 weeks, so a one-year window must not divide by 52
      // and report the training as though 35 weeks had been skipped.
      const a = aggregate(sets, '1y');
      expect(a.weeks).toBeCloseTo(17.29, 1);
      expect(a.weeks).toBeLessThan(52);
    });

    it('separates "this year" from "1 year" once the data is long enough', () => {
      // With only a few months logged both windows clamp to the data span. Given
      // two years of history they must diverge: year-to-date is the shorter one.
      const twoYears: SetRow[] = [
        ...sets,
        ...sets.map((s) => ({
          ...s,
          workoutStart: s.workoutStart - 550 * 86_400_000,
          workoutEnd: s.workoutEnd - 550 * 86_400_000,
        })),
      ];
      const ytd = aggregate(twoYears, 'ytd');
      const year = aggregate(twoYears, '1y');
      expect(ytd.weeks).toBeLessThan(year.weeks);
      expect(year.weeks).toBeCloseTo(52.14, 1);
    });
  });

  describe('set counting', () => {
    it('excludes warm-up sets and nothing else', () => {
      // 32 rows - 2 warm-ups = 30 working sets across the whole file.
      const a = aggregate(sets, 'ytd');
      expect(sets).toHaveLength(32);
      expect(sets.filter((s) => s.isWarmup)).toHaveLength(2);
      expect(a.workingSets).toBe(30);
    });

    it('counts timed holds and cardio bouts as sets', () => {
      const plankSets = sets.filter((s) => s.exercise === 'Plank' && !s.isWarmup);
      expect(plankSets.length).toBeGreaterThan(0);
      expect(plankSets.every((s) => s.reps == null && s.timeSec != null)).toBe(true);
      expect(aggregate(sets, 'ytd').byMuscle.abs.exercises.map((e) => e.exercise)).toContain(
        'Plank',
      );
    });
  });

  describe('the fixture 1-month window', () => {
    const a = aggregate(sets, '1m');

    it('reports the expected session and set totals', () => {
      expect(a.workouts).toBe(4);
      expect(a.workingSets).toBe(22);
    });

    // Ground truth, derived independently during planning. If these drift, the
    // parser, the mapping table or the aggregation has changed behaviour.
    it.each([
      ['lats', 6],
      ['upper-back', 5.5],
      ['biceps', 4],
      ['chest', 3],
      ['rear-delts', 3],
      ['abs', 2.5],
      ['front-delts', 2],
      ['triceps', 2],
      ['quads', 2],
      ['glutes', 2],
      ['forearms', 1.5],
      ['hamstrings', 1.5],
      ['side-delts', 1],
      ['traps', 1],
      ['lower-back', 1],
      ['obliques', 1],
      ['calves', 1],
      ['adductors', 0],
      ['tibialis', 0],
    ] as const)('%s accumulates %f weighted sets', (muscle, totalSets) => {
      expect(a.byMuscle[muscle].totalSets).toBe(totalSets);
      // The per-week figure is just this divided by the window length; asserting
      // the relationship keeps the test independent of the calendar.
      expect(a.byMuscle[muscle].setsPerWeek).toBeCloseTo(totalSets / a.weeks, 10);
    });

    it('ranks lats highest', () => {
      expect(a.ranked[0].muscle).toBe('lats');
      expect(a.ranked[1].muscle).toBe('upper-back');
      expect(a.maxSetsPerWeek).toBeCloseTo(6 / a.weeks, 10);
    });

    it('breaks ties by taxonomy order, deterministically', () => {
      // side-delts, traps, lower-back, obliques and calves all sit at 1 weighted
      // set. Array.sort is stable, so MUSCLES order decides — pin that down
      // rather than leaving the ranking's tail to engine behaviour.
      const tied = a.ranked.filter((s) => s.totalSets === 1).map((s) => s.muscle);
      expect(tied).toEqual(['side-delts', 'traps', 'lower-back', 'obliques', 'calves']);
    });

    it('distinguishes an untrained muscle from the coldest trained one', () => {
      expect(a.byMuscle.adductors.setsPerWeek).toBe(0);
      expect(a.byMuscle.adductors.exercises).toEqual([]);
      expect(a.byMuscle.tibialis.setsPerWeek).toBe(0);
      expect(a.byMuscle.obliques.setsPerWeek).toBeGreaterThan(0);
    });

    it('breaks a muscle down into the exercises that fed it', () => {
      expect(a.byMuscle.lats.exercises).toEqual([
        { exercise: 'Lat Pulldown', sets: 3, contribution: 1, weightedSets: 3 },
        { exercise: 'Barbell Row', sets: 2, contribution: 1, weightedSets: 2 },
        { exercise: 'Pull-Up', sets: 1, contribution: 1, weightedSets: 1 },
      ]);
      // Weighted total must reconcile with the headline figure.
      const summed = a.byMuscle.lats.exercises.reduce((t, e) => t + e.weightedSets, 0);
      expect(summed).toBe(a.byMuscle.lats.totalSets);
    });

    it('weights secondary contributions at half a set', () => {
      // Rowing sits outside the 1-month window, so widen to catch the halved
      // contribution it makes to lats.
      const wide = aggregate(sets, 'ytd');
      const rowing = wide.byMuscle.lats.exercises.find(
        (e) => e.exercise === 'Rowing (Machine)',
      )!;
      expect(rowing.contribution).toBe(0.5);
      expect(rowing.weightedSets).toBe(rowing.sets * 0.5);
    });
  });

  describe('mapping coverage reporting', () => {
    it('reports nothing unmapped or inferred for the fixture', () => {
      const a = aggregate(sets, 'ytd');
      expect(a.unmapped).toEqual([]);
      expect(a.inferred).toEqual([]);
    });

    it('surfaces an unknown exercise instead of silently dropping it', () => {
      const withUnknown: SetRow[] = [
        ...sets,
        { ...sets[0], exercise: 'Underwater Basket Weaving', isWarmup: false, reps: 10 },
      ];
      const a = aggregate(withUnknown, 'ytd');
      expect(a.unmapped).toEqual([{ exercise: 'Underwater Basket Weaving', sets: 1 }]);
    });

    it('flags a heuristically matched exercise as inferred', () => {
      const withNew: SetRow[] = [
        ...sets,
        { ...sets[0], exercise: 'Bulgarian Split Squat', isWarmup: false, reps: 10 },
      ];
      const a = aggregate(withNew, 'ytd');
      expect(a.inferred.map((i) => i.exercise)).toEqual(['Bulgarian Split Squat']);
      expect(a.unmapped).toEqual([]);
      // ...and it still contributes to the map, rather than being withheld.
      expect(a.byMuscle.quads.exercises.map((e) => e.exercise)).toContain(
        'Bulgarian Split Squat',
      );
    });
  });
});
