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
      const a = aggregate(sets, '8w');
      expect(new Date(a.anchor).toISOString().slice(0, 10)).toBe('2026-06-30');
      expect(new Date(a.windowStart).toISOString().slice(0, 10)).toBe('2026-05-05');
      expect(a.anchor).toBeLessThan(Date.now());
      expect(a.workouts).toBe(5);
    });

    it('divides by the nominal window length when the data covers it', () => {
      expect(aggregate(sets, '4w').weeks).toBe(4);
      expect(aggregate(sets, '8w').weeks).toBe(8);
      expect(aggregate(sets, '12w').weeks).toBe(12);
    });

    it('divides "all time" by the actual span of the data', () => {
      const a = aggregate(sets, 'all');
      expect(a.weeks).toBeCloseTo(17.29, 1);
      expect(a.workouts).toBe(7);
    });

    it('never divides by weeks that predate the first workout', () => {
      // A two-week-old log viewed at "12 weeks" must not read as though ten
      // weeks of training had been skipped.
      const day = 24 * 60 * 60 * 1000;
      const recent = sets.filter((s) => s.workoutStart >= sets[0].workoutStart - 14 * day);
      const a = aggregate(recent, '12w');
      expect(a.weeks).toBeLessThan(12);
      expect(a.weeks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('set counting', () => {
    it('excludes warm-up sets and nothing else', () => {
      // 32 rows - 2 warm-ups = 30 working sets across the whole file.
      const a = aggregate(sets, 'all');
      expect(sets).toHaveLength(32);
      expect(sets.filter((s) => s.isWarmup)).toHaveLength(2);
      expect(a.workingSets).toBe(30);
    });

    it('counts timed holds and cardio bouts as sets', () => {
      const plankSets = sets.filter((s) => s.exercise === 'Plank' && !s.isWarmup);
      expect(plankSets.length).toBeGreaterThan(0);
      expect(plankSets.every((s) => s.reps == null && s.timeSec != null)).toBe(true);
      expect(aggregate(sets, 'all').byMuscle.abs.exercises.map((e) => e.exercise)).toContain(
        'Plank',
      );
    });
  });

  describe('the fixture 8-week window', () => {
    const a = aggregate(sets, '8w');

    it('reports the expected session and set totals', () => {
      expect(a.workouts).toBe(5);
      expect(a.workingSets).toBe(26);
    });

    // Ground truth, derived independently during planning. If these drift, the
    // parser, the mapping table or the aggregation has changed behaviour.
    it.each([
      ['lats', 6.5, 0.8125],
      ['upper-back', 6, 0.75],
      ['biceps', 4, 0.5],
      ['abs', 3.5, 0.4375],
      ['chest', 3, 0.375],
      ['rear-delts', 3, 0.375],
      ['glutes', 3, 0.375],
      ['quads', 2.5, 0.3125],
      ['hamstrings', 2.5, 0.3125],
      ['front-delts', 2, 0.25],
      ['traps', 2, 0.25],
      ['triceps', 2, 0.25],
      ['lower-back', 1.5, 0.1875],
      ['forearms', 1.5, 0.1875],
      ['side-delts', 1, 0.125],
      ['obliques', 1, 0.125],
      ['calves', 1, 0.125],
      ['adductors', 0, 0],
      ['tibialis', 0, 0],
    ] as const)('%s: %f sets -> %f/week', (muscle, totalSets, setsPerWeek) => {
      expect(a.byMuscle[muscle].totalSets).toBe(totalSets);
      expect(a.byMuscle[muscle].setsPerWeek).toBeCloseTo(setsPerWeek, 6);
    });

    it('ranks lats highest', () => {
      expect(a.ranked[0].muscle).toBe('lats');
      expect(a.ranked[1].muscle).toBe('upper-back');
      expect(a.maxSetsPerWeek).toBeCloseTo(0.8125, 6);
    });

    it('breaks ties by taxonomy order, deterministically', () => {
      // side-delts, obliques and calves all sit at 0.125. Array.sort is stable,
      // so MUSCLES order decides — this pins that down rather than leaving the
      // ranking's tail dependent on engine behaviour.
      const tied = a.ranked.filter((s) => s.setsPerWeek === 0.125).map((s) => s.muscle);
      expect(tied).toEqual(['side-delts', 'obliques', 'calves']);
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
        { exercise: 'Rowing (Machine)', sets: 1, contribution: 0.5, weightedSets: 0.5 },
      ]);
      // Weighted total must reconcile with the headline figure.
      const summed = a.byMuscle.lats.exercises.reduce((t, e) => t + e.weightedSets, 0);
      expect(summed).toBe(a.byMuscle.lats.totalSets);
    });

    it('weights secondary contributions at half a set', () => {
      const rowing = a.byMuscle.lats.exercises.find(
        (e) => e.exercise === 'Rowing (Machine)',
      )!;
      expect(rowing.contribution).toBe(0.5);
      expect(rowing.weightedSets).toBe(rowing.sets * 0.5);
    });
  });

  describe('mapping coverage reporting', () => {
    it('reports nothing unmapped or inferred for the reference export', () => {
      const a = aggregate(sets, 'all');
      expect(a.unmapped).toEqual([]);
      expect(a.inferred).toEqual([]);
    });

    it('surfaces an unknown exercise instead of silently dropping it', () => {
      const withUnknown: SetRow[] = [
        ...sets,
        { ...sets[0], exercise: 'Underwater Basket Weaving', isWarmup: false, reps: 10 },
      ];
      const a = aggregate(withUnknown, 'all');
      expect(a.unmapped).toEqual([{ exercise: 'Underwater Basket Weaving', sets: 1 }]);
    });

    it('flags a heuristically matched exercise as inferred', () => {
      const withNew: SetRow[] = [
        ...sets,
        { ...sets[0], exercise: 'Bulgarian Split Squat', isWarmup: false, reps: 10 },
      ];
      const a = aggregate(withNew, 'all');
      expect(a.inferred.map((i) => i.exercise)).toEqual(['Bulgarian Split Squat']);
      expect(a.unmapped).toEqual([]);
      // ...and it still contributes to the map, rather than being withheld.
      expect(a.byMuscle.quads.exercises.map((e) => e.exercise)).toContain(
        'Bulgarian Split Squat',
      );
    });
  });
});
