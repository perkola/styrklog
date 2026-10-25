import type { Muscle, MuscleContribution, Resolution } from './types';

/** Primary mover. */
const P = 1;
/** Meaningful secondary involvement. */
const S = 0.5;

type Entry = ReadonlyArray<readonly [Muscle, number]>;

/**
 * Normalise an exercise name for lookup.
 *
 * StrengthLog uses typographic punctuation — "Captain’s Chair Knee Raises"
 * carries U+2019, not an ASCII apostrophe — and Unicode normalisation alone
 * does not fold it, so the quote and dash classes are replaced explicitly.
 */
export function normalizeExerciseName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .replace(/[‘’ʼʹ]/g, "'")
    .replace(/[‐-―−]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Explicit mapping, keyed by normalised name. Covers every exercise in the
 * reference export. Adding an exercise here always beats the heuristics below.
 */
const TABLE: Readonly<Record<string, Entry>> = {
  'back extension': [['lower-back', P], ['glutes', S], ['hamstrings', S]],
  'bar dip': [['chest', P], ['triceps', P], ['front-delts', S]],
  'bar hang': [['forearms', P], ['lats', S]],
  'barbell lying triceps extension': [['triceps', P]],
  'barbell row': [['lats', P], ['upper-back', P], ['biceps', S], ['rear-delts', S]],
  'bayesian curl': [['biceps', P]],
  'bench press': [['chest', P], ['triceps', S], ['front-delts', S]],
  'box step-up': [['quads', P], ['glutes', P]],
  'cable chest press': [['chest', P], ['triceps', S], ['front-delts', S]],
  'cable close-grip seated row': [['lats', P], ['upper-back', P], ['biceps', S]],
  'cable crunch': [['abs', P]],
  'cable curl with bar': [['biceps', P], ['forearms', S]],
  'cable external shoulder rotation': [['rear-delts', S]],
  'cable horizontal wood chop': [['obliques', P], ['abs', S]],
  // Flys are isolation work: no meaningful triceps involvement, unlike a press.
  'cable incline chest fly': [['chest', P], ['front-delts', S]],
  'cable internal shoulder rotation': [['front-delts', S]],
  'cable lateral raise': [['side-delts', P]],
  'cable wide grip seated row': [['upper-back', P], ['lats', S], ['rear-delts', S]],
  'calf raise in leg press': [['calves', P]],
  "captain's chair knee raises": [['abs', P], ['obliques', S]],
  'chin-up': [['lats', P], ['biceps', P]],
  'crossbody cable triceps extension': [['triceps', P]],
  deadlift: [['lower-back', P], ['glutes', P], ['hamstrings', P], ['traps', S], ['forearms', S]],
  'dumbbell chest press': [['chest', P], ['triceps', S], ['front-delts', S]],
  'dumbbell curl': [['biceps', P], ['forearms', S]],
  'dumbbell lateral raise': [['side-delts', P]],
  'dumbbell preacher curl': [['biceps', P]],
  'dumbbell row': [['lats', P], ['upper-back', P], ['biceps', S]],
  'dumbbell shrug': [['traps', P]],
  // Named "curl" but a wrist-flexion isolation move, not a biceps exercise —
  // the generic \bcurl\b heuristic would mismap this, so it needs the table.
  'dumbbell wrist curl': [['forearms', P]],
  'dumbbell wrist extension': [['forearms', P]],
  'ez curl': [['biceps', P], ['forearms', S]],
  'face pull': [['rear-delts', P], ['upper-back', P]],
  'farmers walk': [['forearms', P], ['traps', P], ['abs', S]],
  'goblet squat': [['quads', P], ['glutes', S]],
  'good morning': [['hamstrings', P], ['glutes', P], ['lower-back', S]],
  'hammer curl': [['biceps', P], ['forearms', P]],
  'hanging knee raise': [['abs', P], ['forearms', S]],
  'hip thrust': [['glutes', P], ['hamstrings', S]],
  // Incline presses load front delts as a second primary mover, not just a
  // secondary one — matches incline dumbbell press below, unlike flat bench.
  'incline bench press': [['chest', P], ['front-delts', P], ['triceps', S]],
  'incline dumbbell press': [['chest', P], ['front-delts', P], ['triceps', S]],
  'lat pulldown': [['lats', P], ['biceps', S], ['upper-back', S]],
  'lat pulldown with neutral grip': [['lats', P], ['biceps', S], ['upper-back', S]],
  'leg extension': [['quads', P]],
  'leg press': [['quads', P], ['glutes', S]],
  'lying leg curl': [['hamstrings', P]],
  'lying leg raise': [['abs', P]],
  'lying triceps extension with ez bar': [['triceps', P]],
  'machine back extension': [['lower-back', P], ['glutes', S]],
  'machine chest fly': [['chest', P], ['front-delts', S]],
  'machine chest press': [['chest', P], ['triceps', S], ['front-delts', S]],
  'machine crunch': [['abs', P]],
  'machine overhead triceps extension': [['triceps', P]],
  'machine shoulder press': [['front-delts', P], ['side-delts', S], ['triceps', S]],
  'machine triceps press': [['triceps', P]],
  'neutral close-grip lat pulldown': [['lats', P], ['biceps', S]],
  'one-legged glute bridge': [['glutes', P], ['hamstrings', S]],
  'one-legged heel raise': [['calves', P]],
  'one-legged leg extension': [['quads', P]],
  'one-legged seated leg press': [['quads', P], ['glutes', S]],
  'overhead cable triceps extension': [['triceps', P]],
  'overhead press': [['front-delts', P], ['side-delts', S], ['triceps', S]],
  plank: [['abs', P], ['obliques', S]],
  'plank to push-up': [['abs', P], ['chest', S], ['triceps', S]],
  'pull-up': [['lats', P], ['biceps', S], ['upper-back', S]],
  pullover: [['lats', P], ['chest', S], ['triceps', S]],
  'push-up': [['chest', P], ['triceps', S], ['front-delts', S]],
  'reverse cable fly': [['rear-delts', P], ['upper-back', S]],
  'reverse machine fly': [['rear-delts', P], ['upper-back', S]],
  'romanian deadlift': [['hamstrings', P], ['glutes', P], ['lower-back', S]],
  'rowing (machine)': [['lats', S], ['quads', S], ['upper-back', S]],
  'seated dumbbell shoulder press': [['front-delts', P], ['side-delts', S], ['triceps', S]],
  'seated leg curl': [['hamstrings', P]],
  'seated leg press': [['quads', P], ['glutes', S]],
  'side plank': [['obliques', P], ['abs', S]],
  'smith machine calf raise': [['calves', P]],
  'smith machine incline bench press': [['chest', P], ['front-delts', P], ['triceps', S]],
  'smith machine romanian deadlift': [['hamstrings', P], ['glutes', P], ['lower-back', S]],
  'smith machine shrug': [['traps', P]],
  'standing cable chest fly (lower position)': [['chest', P], ['front-delts', S]],
  'standing cable chest fly (upper position)': [['chest', P], ['front-delts', S]],
  'standing calf raise': [['calves', P]],
  'suitcase carry': [['obliques', P], ['forearms', P]],
  'tibialis raise': [['tibialis', P]],
  'triceps pushdown with bar': [['triceps', P]],
  'triceps pushdown with rope': [['triceps', P]],
};

/**
 * Ordered keyword fallbacks for exercises added to StrengthLog after this table
 * was written. Order matters: the first match wins, so narrow patterns must come
 * before the broad ones they'd otherwise be swallowed by ("leg curl" before
 * "curl", "rowing" excluded from "row").
 */
const HEURISTICS: ReadonlyArray<readonly [RegExp, Entry]> = [
  [/\bleg curl\b/, [['hamstrings', P]]],
  [/\b(calf|heel) raise\b/, [['calves', P]]],
  [/\btibialis\b/, [['tibialis', P]]],
  [/\blateral raise\b/, [['side-delts', P]]],
  [/\b(rear delt|reverse fly|reverse cable fly|reverse machine fly|face pull)\b/, [['rear-delts', P], ['upper-back', S]]],
  [/\bshrug\b/, [['traps', P]]],
  [/\b(pulldown|pull-?up|chin-?up)\b/, [['lats', P], ['biceps', S], ['upper-back', S]]],
  [/\b(triceps|pushdown|skull ?crusher)\b/, [['triceps', P]]],
  [/\bcurl\b/, [['biceps', P], ['forearms', S]]],
  [/\b(shoulder press|overhead press|military press)\b/, [['front-delts', P], ['side-delts', S], ['triceps', S]]],
  [/\b(bench press|chest press|chest fly|pec deck|push-?up|dip)\b/, [['chest', P], ['triceps', S], ['front-delts', S]]],
  [/\browing\b/, [['lats', S], ['quads', S], ['upper-back', S]]],
  [/\brow\b/, [['lats', P], ['upper-back', P], ['biceps', S]]],
  [/\b(romanian deadlift|rdl|good ?morning)\b/, [['hamstrings', P], ['glutes', P], ['lower-back', S]]],
  [/\bdeadlift\b/, [['lower-back', P], ['glutes', P], ['hamstrings', P], ['traps', S]]],
  [/\bhip thrust\b/, [['glutes', P], ['hamstrings', S]]],
  [/\b(squat|leg press|leg extension|lunge|step-?up)\b/, [['quads', P], ['glutes', S]]],
  [/\b(back extension|hyperextension)\b/, [['lower-back', P], ['glutes', S]]],
  [/\b(plank|crunch|sit-?up|knee raise|leg raise|ab wheel)\b/, [['abs', P]]],
  [/\b(oblique|wood chop|side bend)\b/, [['obliques', P], ['abs', S]]],
  [/\b(wrist|forearm|grip|hang|carry)\b/, [['forearms', P]]],
  [/\b(adductor|abductor)\b/, [['adductors', P]]],
];

function toContributions(entry: Entry): MuscleContribution[] {
  return entry.map(([muscle, weight]) => ({ muscle, weight }));
}

/**
 * Resolve an exercise name to the muscles it trains.
 *
 * Returns null when nothing matches — the caller surfaces those in the unmapped
 * report rather than silently dropping them, so the map never quietly ignores
 * part of your training.
 */
export function resolveExercise(name: string): Resolution | null {
  const key = normalizeExerciseName(name);

  const exact = TABLE[key];
  if (exact) return { contributions: toContributions(exact), inferred: false };

  for (const [pattern, entry] of HEURISTICS) {
    if (pattern.test(key)) {
      return { contributions: toContributions(entry), inferred: true };
    }
  }
  return null;
}

/** Exposed for the mapping-coverage test. */
export const MAPPED_EXERCISE_COUNT = Object.keys(TABLE).length;
