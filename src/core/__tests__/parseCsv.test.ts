import { CsvParseError, parseDuration, parseStrengthLogCsv } from '../parseCsv';
import { SAMPLE_CSV } from './fixture';

describe('parseStrengthLogCsv', () => {
  const sets = parseStrengthLogCsv(SAMPLE_CSV);

  it('parses every set in the fixture', () => {
    expect(sets).toHaveLength(32);
  });

  it('finds the expected workouts and exercises', () => {
    expect(new Set(sets.map((s) => s.workoutStart)).size).toBe(7);
    expect(new Set(sets.map((s) => s.exercise)).size).toBe(26);
  });

  it('keeps commas inside quoted workout names intact', () => {
    const named = sets.find((s) => s.workoutName.startsWith('Tuesday Evening'));
    expect(named?.workoutName).toBe('Tuesday Evening: Back, Biceps, Abs etc.');
  });

  it('does not let the duplicate `calories` column clobber the cardio field', () => {
    // The export names two columns `calories`: a set-level cardio figure and a
    // daily wellness score. A header-keyed parse collapses them silently, so
    // give the two columns different values and prove we read the first.
    // The fixture itself also carries 95 in the cardio column and nothing in the
    // wellness one, so a regression would show up there too.
    const header = SAMPLE_CSV.slice(0, SAMPLE_CSV.indexOf('\n')).split(',');
    expect(header.filter((c) => c === 'calories')).toHaveLength(2);

    const synthetic = [
      header.join(','),
      header
        .map((name, i) => {
          if (name === 'workout') return 'W';
          if (name === 'start' || name === 'end') return '1782831124652';
          if (name === 'exercise') return 'Leg Press';
          if (name === 'reps') return '10';
          if (name === 'weight') return '100';
          // 111 in the cardio column, 999 in the trailing wellness column.
          if (name === 'calories') return i === header.indexOf('calories') ? '111' : '999';
          return '';
        })
        .join(','),
    ].join('\n');

    const [set] = parseStrengthLogCsv(synthetic);
    expect(set.caloriesBurned).toBe(111);
  });

  it('preserves the U+2019 apostrophe in exercise names', () => {
    const exercises = new Set(sets.map((s) => s.exercise));
    expect(exercises.has('Captain’s Chair Knee Raises')).toBe(true);
  });

  it('flags warm-up and failure sets', () => {
    expect(sets.filter((s) => s.isWarmup)).toHaveLength(2);
    expect(sets.filter((s) => s.isFailure)).toHaveLength(1);
  });

  describe('set shapes', () => {
    const shapeOf = (s: (typeof sets)[number]) =>
      (
        [
          ['weight', s.weightKg],
          ['bodyweight', s.bodyweightKg],
          ['assistingWeight', s.assistingWeightKg],
          ['extraWeight', s.extraWeightKg],
          ['distance', s.distanceM],
          ['height', s.height],
          ['reps', s.reps],
          ['time', s.timeSec],
        ] as const
      )
        .filter(([, v]) => v != null && v !== 0)
        .map(([k]) => k)
        .join('+');

    // Every shape present in the reference export, with its exact count.
    it.each([
      ['weight+reps', 24],
      ['bodyweight+reps', 2],
      ['bodyweight+time', 1],
      ['bodyweight+extraWeight+reps', 1],
      ['distance+time', 1],
      ['weight+distance', 1],
      ['bodyweight+assistingWeight+reps', 1],
      ['bodyweight+height+reps', 1],
    ])('handles %s (%i sets)', (shape, count) => {
      expect(sets.filter((s) => shapeOf(s) === shape)).toHaveLength(count);
    });
  });

  it('normalises distanceKM to metres', () => {
    const rowing = sets.find((s) => s.exercise === 'Rowing (Machine)');
    expect(rowing?.distanceM).toBe(2000);
    expect(rowing?.timeSec).toBe(600);
  });

  it('rejects a file that is not a StrengthLog export', () => {
    expect(() => parseStrengthLogCsv('a,b,c\n1,2,3')).toThrow(CsvParseError);
  });
});

describe('parseDuration', () => {
  it.each([
    ['00:10:00', 600],
    ['00:00:45', 45],
    ['01:30:00', 5400],
    ['02:30', 150],
    ['', null],
  ])('parses %s', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });
});
