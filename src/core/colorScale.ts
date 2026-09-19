/**
 * Colour for the muscle fills.
 *
 * Both scale modes use the SAME sequential blue-to-purple ramp and differ only
 * in what anchors the top of the scale. This is a deliberate departure from the
 * original sketch, which had the absolute mode use a diverging ramp with a
 * neutral midpoint for "optimal": a grey midpoint would have collided head-on
 * with the grey that means "never trained", making the map's single most
 * important distinction — worked a little vs. not worked at all — unreadable.
 * Volume is a magnitude, not a polarity, so one continuous ramp is also the correct form.
 * The legend annotates the volume landmarks in absolute mode instead.
 *
 * The ramp runs from a pale, white-tinted blue through blue and indigo to a deep
 * purple. Its six anchors are spaced at equal steps of CIELAB lightness (L* 84 ->
 * 14, 14 apiece), so equal changes in sets/week look like equal changes in shade
 * and little / medium / heavy training stay distinguishable. The light end is a
 * clearly blue-tinted step darker than the "no data" grey, so the coldest
 * *trained* muscle never reads as untrained.
 */

export type ScaleMode = 'relative' | 'absolute';

/** Ramp anchors, light -> dark. */
const RAMP = ['#a7d7fe', '#4bb3fd', '#0f8cdb', '#0661c4', '#3c3492', '#2b1753'] as const;

/**
 * A muscle with no logged sets. Distinct from the bottom of the ramp on purpose:
 * "no data" and "lowest value" must never look the same.
 */
export const NO_DATA_FILL = '#e1e0d9';

/**
 * Upper anchor for the absolute scale, in sets per muscle per week. Sits at the
 * top of the commonly cited productive range (roughly 10-20 sets/week), so a
 * muscle at the ceiling is genuinely well trained rather than merely the most
 * trained thing you happen to do.
 */
export const ABSOLUTE_CEILING = 20;

/** Landmark boundaries annotated on the legend in absolute mode. */
export const VOLUME_LANDMARKS = [
  { at: 6, label: 'low' },
  { at: 10, label: 'productive' },
  { at: 20, label: 'high' },
] as const;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const to = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Sample the ramp at t in [0,1]. Interpolates between adjacent anchors. */
export function sampleRamp(t: number): string {
  const clamped = clamp01(t);
  const scaled = clamped * (RAMP.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(lower + 1, RAMP.length - 1);
  const frac = scaled - lower;

  const a = hexToRgb(RAMP[lower]);
  const b = hexToRgb(RAMP[upper]);
  return rgbToHex([
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    a[2] + (b[2] - a[2]) * frac,
  ]);
}

/**
 * Normalise a sets-per-week figure to a ramp position.
 *
 * `relative` divides by the busiest muscle, so the map always uses the full
 * range and stays readable whatever your training frequency.
 * `absolute` divides by a fixed volume ceiling, so two different imports —
 * or two different windows — are directly comparable.
 */
export function scalePosition(
  setsPerWeek: number,
  mode: ScaleMode,
  maxSetsPerWeek: number,
): number {
  if (mode === 'absolute') return clamp01(setsPerWeek / ABSOLUTE_CEILING);
  if (maxSetsPerWeek <= 0) return 0;
  return clamp01(setsPerWeek / maxSetsPerWeek);
}

/** Fill colour for one muscle. Untrained muscles get the neutral, not the ramp. */
export function muscleFill(
  setsPerWeek: number,
  mode: ScaleMode,
  maxSetsPerWeek: number,
): string {
  if (setsPerWeek <= 0) return NO_DATA_FILL;
  return sampleRamp(scalePosition(setsPerWeek, mode, maxSetsPerWeek));
}
