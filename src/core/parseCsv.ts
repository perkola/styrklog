import Papa from 'papaparse';
import type { SetRow } from './types';

export class CsvParseError extends Error {}

/**
 * StrengthLog's export has a quirk that breaks naive parsing: the header
 * contains the name `calories` TWICE — once as a set-level cardio field and
 * again as a daily wellness score. Any header-keyed parser (including
 * PapaParse's own `header: true`) silently collapses them and drops one.
 *
 * So we parse as raw arrays and resolve column positions ourselves, recording
 * every index a name appears at and choosing deliberately.
 */
function buildColumnIndex(header: string[]): Map<string, number[]> {
  const index = new Map<string, number[]>();
  header.forEach((rawName, i) => {
    const name = rawName.trim();
    const existing = index.get(name);
    if (existing) existing.push(i);
    else index.set(name, [i]);
  });
  return index;
}

/** Number, or null for blank/unparseable. Note 0 is a legitimate value and is kept. */
function num(raw: string | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** "00:10:00" -> 600. Tolerates "mm:ss" as well as "hh:mm:ss". */
export function parseDuration(raw: string | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parts = trimmed.split(':').map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

function bool(raw: string | undefined): boolean {
  return raw?.trim().toLowerCase() === 'true';
}

const REQUIRED_COLUMNS = ['workout', 'start', 'end', 'exercise'];

/**
 * Parse a StrengthLog CSV export into working set rows.
 *
 * Rows missing a usable `start` or `exercise` are skipped rather than throwing —
 * a single malformed line shouldn't cost you the whole import.
 */
export function parseStrengthLogCsv(csvText: string): SetRow[] {
  const result = Papa.parse<string[]>(csvText.trim(), {
    header: false,
    skipEmptyLines: true,
  });

  const rows = result.data;
  if (rows.length === 0) throw new CsvParseError('The file is empty.');

  const header = rows[0];
  const columns = buildColumnIndex(header);

  const missing = REQUIRED_COLUMNS.filter((c) => !columns.has(c));
  if (missing.length > 0) {
    throw new CsvParseError(
      `This doesn't look like a StrengthLog export — missing column(s): ${missing.join(', ')}.`,
    );
  }

  /** First index for a name. */
  const at = (name: string): number => columns.get(name)?.[0] ?? -1;
  /** Nth index for a name, for the duplicated ones. */
  const atNth = (name: string, n: number): number => columns.get(name)?.[n] ?? -1;

  const col = {
    workout: at('workout'),
    start: at('start'),
    end: at('end'),
    exercise: at('exercise'),
    weight: at('weight'),
    bodyweight: at('bodyweight'),
    assistingWeight: at('assistingWeight'),
    extraWeight: at('extraWeight'),
    distanceKM: at('distanceKM'),
    distanceM: at('distanceM'),
    height: at('height'),
    reps: at('reps'),
    time: at('time'),
    // The first `calories` is the set-level cardio figure. The second (index 1)
    // is the daily wellness score, which we intentionally don't carry.
    caloriesBurned: atNth('calories', 0),
    warmup: at('warmup'),
    fail: at('fail'),
  };

  const get = (row: string[], i: number): string | undefined =>
    i >= 0 ? row[i] : undefined;

  const sets: SetRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const workoutStart = num(get(row, col.start));
    const exercise = get(row, col.exercise)?.trim();
    if (workoutStart == null || !exercise) continue;

    const km = num(get(row, col.distanceKM));
    const m = num(get(row, col.distanceM));
    const distanceM = km != null && km !== 0 ? km * 1000 : m;

    sets.push({
      workoutName: get(row, col.workout)?.trim() ?? '',
      workoutStart,
      workoutEnd: num(get(row, col.end)) ?? workoutStart,
      exercise,
      weightKg: num(get(row, col.weight)),
      bodyweightKg: num(get(row, col.bodyweight)),
      assistingWeightKg: num(get(row, col.assistingWeight)),
      extraWeightKg: num(get(row, col.extraWeight)),
      height: num(get(row, col.height)),
      reps: num(get(row, col.reps)),
      timeSec: parseDuration(get(row, col.time)),
      distanceM,
      isWarmup: bool(get(row, col.warmup)),
      isFailure: bool(get(row, col.fail)),
      caloriesBurned: num(get(row, col.caloriesBurned)),
    });
  }

  if (sets.length === 0) {
    throw new CsvParseError('No sets found in the file.');
  }
  return sets;
}
