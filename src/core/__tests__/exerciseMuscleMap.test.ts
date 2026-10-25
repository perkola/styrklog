import { normalizeExerciseName, resolveExercise } from '../exerciseMuscleMap';
import { parseStrengthLogCsv } from '../parseCsv';
import { SAMPLE_CSV } from './fixture';

describe('normalizeExerciseName', () => {
  it('folds the typographic apostrophe StrengthLog exports', () => {
    expect(normalizeExerciseName('Captain’s Chair Knee Raises')).toBe(
      "captain's chair knee raises",
    );
  });

  it('collapses case and whitespace', () => {
    expect(normalizeExerciseName('  Lat   PULLDOWN ')).toBe('lat pulldown');
  });
});

describe('resolveExercise', () => {
  it('covers every exercise in the fixture with an explicit mapping', () => {
    // This is the regression guard on the mapping table: if an exercise falls
    // through to the heuristics or to nothing at all, the map is quietly
    // misrepresenting real training.
    const exercises = [
      ...new Set(parseStrengthLogCsv(SAMPLE_CSV).map((s) => s.exercise)),
    ];
    expect(exercises).toHaveLength(26);

    const unmapped = exercises.filter((e) => resolveExercise(e) === null);
    const inferred = exercises.filter((e) => resolveExercise(e)?.inferred);

    expect(unmapped).toEqual([]);
    expect(inferred).toEqual([]);
  });

  it('resolves the U+2019 exercise via the table, not a heuristic', () => {
    const r = resolveExercise('Captain’s Chair Knee Raises');
    expect(r?.inferred).toBe(false);
    expect(r?.contributions).toEqual([
      { muscle: 'abs', weight: 1 },
      { muscle: 'obliques', weight: 0.5 },
    ]);
  });

  it('returns null for something it has never seen', () => {
    expect(resolveExercise('Underwater Basket Weaving')).toBeNull();
  });

  describe('exercises from the 90-day export, added to the table', () => {
    it.each([
      ['Bench Press', [['chest', 1], ['triceps', 0.5], ['front-delts', 0.5]]],
      ['Dumbbell Chest Press', [['chest', 1], ['triceps', 0.5], ['front-delts', 0.5]]],
      // Flys are isolation work: chest + a little front-delt, no triceps —
      // unlike a press, which the generic heuristic would otherwise imply.
      ['Cable Incline Chest Fly', [['chest', 1], ['front-delts', 0.5]]],
      ['Standing Cable Chest Fly (Lower Position)', [['chest', 1], ['front-delts', 0.5]]],
      // Incline presses load front delts as a second primary mover.
      ['Incline Bench Press', [['chest', 1], ['front-delts', 1], ['triceps', 0.5]]],
      ['Overhead Press', [['front-delts', 1], ['side-delts', 0.5], ['triceps', 0.5]]],
      [
        'Seated Dumbbell Shoulder Press',
        [['front-delts', 1], ['side-delts', 0.5], ['triceps', 0.5]],
      ],
      // A wrist-flexion isolation move, not a biceps curl — the generic
      // \bcurl\b heuristic would mismap this without a table entry.
      ['Dumbbell Wrist Curl', [['forearms', 1]]],
      ['Good Morning', [['hamstrings', 1], ['glutes', 1], ['lower-back', 0.5]]],
      [
        'Smith Machine Romanian Deadlift',
        [['hamstrings', 1], ['glutes', 1], ['lower-back', 0.5]],
      ],
      ['Standing Calf Raise', [['calves', 1]]],
      ['One-Legged Glute Bridge', [['glutes', 1], ['hamstrings', 0.5]]],
    ] as const)('%s', (name, expected) => {
      const r = resolveExercise(name);
      expect(r?.inferred).toBe(false);
      expect(r?.contributions).toEqual(
        expected.map(([muscle, weight]) => ({ muscle, weight })),
      );
    });
  });

  describe('heuristic fallback for exercises added later', () => {
    it.each([
      ['Standing Leg Curl', 'hamstrings'],
      ['Seated Calf Raise', 'calves'],
      ['Machine Lateral Raise', 'side-delts'],
      ['Barbell Shrug', 'traps'],
      ['Preacher Curl', 'biceps'],
      ['Decline Bench Press', 'chest'],
      ['Bulgarian Split Squat', 'quads'],
      ['T-Bar Row', 'lats'],
    ])('%s -> %s', (name, expectedPrimary) => {
      const r = resolveExercise(name);
      expect(r).not.toBeNull();
      expect(r!.inferred).toBe(true);
      expect(r!.contributions[0].muscle).toBe(expectedPrimary);
    });

    it('matches "leg curl" as hamstrings before "curl" as biceps', () => {
      expect(resolveExercise('Standing Leg Curl')!.contributions[0].muscle).toBe(
        'hamstrings',
      );
      expect(resolveExercise('Zottman Curl')!.contributions[0].muscle).toBe('biceps');
    });

    it('does not mistake "Rowing" the cardio machine for a back row', () => {
      const rowing = resolveExercise('Rowing Machine Intervals')!;
      expect(rowing.contributions.map((c) => c.muscle)).toContain('quads');
      expect(rowing.contributions.every((c) => c.weight === 0.5)).toBe(true);
    });
  });
});
