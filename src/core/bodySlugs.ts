import { muscleFill, NO_DATA_FILL, type ScaleMode } from './colorScale';
import type { Aggregation, Muscle, MuscleStat } from './types';

/**
 * The body-part slugs react-native-body-highlighter actually ships paths for.
 * Mirrored here rather than imported so this directory stays free of UI deps;
 * BodyHeatMap types its output as the library's own `ExtendedBodyPart[]`, which
 * makes TypeScript catch any drift between this union and the real one.
 *
 * Note the library's README advertises an `abductors` slug that does not exist
 * in the shipped assets — it is deliberately absent below.
 */
export type BodySlug =
  | 'abs'
  | 'adductors'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'deltoids'
  | 'forearm'
  | 'gluteal'
  | 'hamstring'
  | 'lower-back'
  | 'obliques'
  | 'quadriceps'
  | 'tibialis'
  | 'trapezius'
  | 'triceps'
  | 'upper-back'
  // Non-muscle regions. Listed because they must be coloured explicitly — see
  // DECORATIVE_SLUGS.
  | 'ankles'
  | 'feet'
  | 'hair'
  | 'hands'
  | 'head'
  | 'knees'
  | 'neck';

export type BodySide = 'front' | 'back';

/**
 * Which of our muscles each slug stands for, per view.
 *
 * Front and back are rendered as two separate <Body> instances with their own
 * data arrays, so a slug present in both can take a different colour in each.
 * That is what lets `deltoids` mean the front delts on the front view and the
 * rear delts on the back view, despite the library exposing a single flat slug.
 */
export const SLUG_MUSCLES: Record<BodySide, Partial<Record<BodySlug, Muscle[]>>> = {
  front: {
    chest: ['chest'],
    deltoids: ['front-delts', 'side-delts'],
    biceps: ['biceps'],
    triceps: ['triceps'],
    forearm: ['forearms'],
    abs: ['abs'],
    obliques: ['obliques'],
    quadriceps: ['quads'],
    adductors: ['adductors'],
    calves: ['calves'],
    tibialis: ['tibialis'],
    trapezius: ['traps'],
  },
  back: {
    deltoids: ['rear-delts'],
    'upper-back': ['lats', 'upper-back'],
    'lower-back': ['lower-back'],
    trapezius: ['traps'],
    triceps: ['triceps'],
    forearm: ['forearms'],
    hamstring: ['hamstrings'],
    gluteal: ['glutes'],
    adductors: ['adductors'],
    calves: ['calves'],
  },
};

/**
 * Regions that carry no training data.
 *
 * These MUST be given an explicit colour. Every path in the library's assets
 * ships with a baked-in `color: '#3f3f3f'`, and the merge only overrides it for
 * slugs present in the data array — which makes the `defaultFill` prop dead for
 * anything we don't list. Left alone, hands, feet, hair and knees render near
 * black and read as the most heavily trained thing on screen, since dark is the
 * top of the volume ramp.
 */
const DECORATIVE_SLUGS: BodySlug[] = [
  'head',
  'neck',
  'hands',
  'feet',
  'ankles',
  'knees',
];

/** Kept a shade darker than the rest so the figure still reads as a person. */
const HAIR_FILL = '#c3c2b7';

export type BodyDatum = { slug: BodySlug; color: string };

/**
 * Colour every slug in one view.
 *
 * Where several muscles share a slug — front `deltoids` covers front and side
 * delts, back `upper-back` covers lats and rhomboids — the region takes the
 * MAXIMUM of its constituents rather than the sum. Summing would inflate a
 * region purely for being anatomically coarse. The drill-down splits the slug
 * back into its parts, so the detail is deferred, not lost.
 */
export function buildBodyData(
  aggregation: Aggregation,
  side: BodySide,
  mode: ScaleMode,
): BodyDatum[] {
  const data: BodyDatum[] = [
    ...DECORATIVE_SLUGS.map((slug) => ({ slug, color: NO_DATA_FILL })),
    { slug: 'hair' as const, color: HAIR_FILL },
  ];
  for (const [slug, muscles] of Object.entries(SLUG_MUSCLES[side])) {
    const peak = Math.max(...muscles.map((m) => aggregation.byMuscle[m].setsPerWeek));
    data.push({
      slug: slug as BodySlug,
      color: muscleFill(peak, mode, aggregation.maxSetsPerWeek),
    });
  }
  return data;
}

/** The muscles behind a tapped region, busiest first. Empty if the slug is decorative. */
export function musclesForSlug(
  aggregation: Aggregation,
  side: BodySide,
  slug: string,
): MuscleStat[] {
  const muscles = SLUG_MUSCLES[side][slug as BodySlug];
  if (!muscles) return [];
  return muscles
    .map((m) => aggregation.byMuscle[m])
    .sort((a, b) => b.setsPerWeek - a.setsPerWeek);
}
