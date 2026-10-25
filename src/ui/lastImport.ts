import { parseStrengthLogCsv } from '../core/parseCsv';
import type { SetRow } from '../core/types';

/**
 * Caches the last successfully-imported CSV so reopening the PWA restores
 * the heat map instead of showing the empty import pitch every time. This is
 * the app's only persistence: on-device only, nothing leaves the browser.
 *
 * Stores the raw CSV text rather than a parallel serialization of `SetRow[]`,
 * so `parseStrengthLogCsv` stays the single source of truth for turning text
 * into sets.
 */
const STORAGE_KEY = 'styrklog.lastImport.v1';

type Cached = { fileName: string; csvText: string };

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // storage access disabled (e.g. locked-down private mode)
  }
}

export function saveLastImport(fileName: string, csvText: string): void {
  const s = storage();
  if (!s) return;
  try {
    const cached: Cached = { fileName, csvText };
    s.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Quota exceeded or storage disabled — the current session still has
    // the data in memory; it just won't be restored on the next launch.
  }
}

export function loadLastImport(): { sets: SetRow[]; fileName: string } | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { fileName, csvText } = JSON.parse(raw) as Cached;
    return { sets: parseStrengthLogCsv(csvText), fileName };
  } catch {
    s.removeItem(STORAGE_KEY); // corrupted entry — don't keep retrying it
    return null;
  }
}

export function clearLastImport(): void {
  storage()?.removeItem(STORAGE_KEY);
}
