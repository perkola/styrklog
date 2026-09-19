import { aggregate } from '../aggregate';
import { buildBodyData, musclesForSlug, SLUG_MUSCLES } from '../bodySlugs';
import { NO_DATA_FILL, sampleRamp } from '../colorScale';
import { parseStrengthLogCsv } from '../parseCsv';
import { MUSCLES } from '../types';
import { SAMPLE_CSV } from './fixture';

const agg = aggregate(parseStrengthLogCsv(SAMPLE_CSV), '8w');

describe('SLUG_MUSCLES', () => {
  it('covers every muscle in our taxonomy somewhere', () => {
    const covered = new Set(
      [...Object.values(SLUG_MUSCLES.front), ...Object.values(SLUG_MUSCLES.back)].flat(),
    );
    expect([...MUSCLES].filter((m) => !covered.has(m))).toEqual([]);
  });

  it('does not use the non-existent `abductors` slug', () => {
    // The library README advertises it; the shipped SVG assets have no such path.
    const slugs = [
      ...Object.keys(SLUG_MUSCLES.front),
      ...Object.keys(SLUG_MUSCLES.back),
    ];
    expect(slugs).not.toContain('abductors');
  });

  it('splits the deltoids by view, which the flat slug list appears to forbid', () => {
    expect(SLUG_MUSCLES.front.deltoids).toEqual(['front-delts', 'side-delts']);
    expect(SLUG_MUSCLES.back.deltoids).toEqual(['rear-delts']);
  });

  it('only places a muscle on a view where that muscle is actually visible', () => {
    expect(SLUG_MUSCLES.front.quadriceps).toBeDefined();
    expect(SLUG_MUSCLES.back.quadriceps).toBeUndefined();
    expect(SLUG_MUSCLES.back.gluteal).toBeDefined();
    expect(SLUG_MUSCLES.front.gluteal).toBeUndefined();
  });
});

describe('buildBodyData', () => {
  it('colours every muscle slug defined for the view', () => {
    for (const side of ['front', 'back'] as const) {
      const slugs = new Set(buildBodyData(agg, side, 'relative').map((d) => d.slug));
      for (const slug of Object.keys(SLUG_MUSCLES[side])) {
        expect(slugs.has(slug as never)).toBe(true);
      }
    }
  });

  it('emits a valid hex colour for every region it touches', () => {
    for (const side of ['front', 'back'] as const) {
      const data = buildBodyData(agg, side, 'relative');
      expect(data.every((d) => /^#[0-9a-f]{6}$/i.test(d.color))).toBe(true);
    }
  });

  it('explicitly neutralises the non-muscle regions', () => {
    // Every path in the library's assets carries a baked-in '#3f3f3f', and the
    // defaultFill prop cannot override it — only an entry in the data array
    // can. Without these, hands, feet and knees render near black and read as
    // the most-trained regions on the figure.
    for (const side of ['front', 'back'] as const) {
      const byslug = new Map(
        buildBodyData(agg, side, 'relative').map((d) => [d.slug, d.color]),
      );
      for (const slug of ['head', 'neck', 'hands', 'feet', 'ankles', 'knees'] as const) {
        expect(byslug.get(slug)).toBe(NO_DATA_FILL);
      }
      expect(byslug.get('hair')).toBeDefined();
      // Nothing neutral may be as dark as the top of the volume ramp.
      const darkest = sampleRamp(1);
      for (const slug of ['head', 'hands', 'feet', 'hair'] as const) {
        expect(byslug.get(slug)).not.toBe(darkest);
        expect(byslug.get(slug)).not.toBe('#3f3f3f');
      }
    }
  });

  it('gives a shared slug the max of its muscles, never the sum', () => {
    // Back `upper-back` stands for both lats and rhomboids. Build a case where
    // max and sum land on visibly different points of the ramp: two muscles at
    // 1.0 each against a ceiling of 2.0 is halfway up if maxed, and pinned at
    // the top if summed.
    const synthetic = {
      ...agg,
      maxSetsPerWeek: 2,
      byMuscle: {
        ...agg.byMuscle,
        lats: { ...agg.byMuscle.lats, setsPerWeek: 1 },
        'upper-back': { ...agg.byMuscle['upper-back'], setsPerWeek: 1 },
      },
    };

    const region = buildBodyData(synthetic, 'back', 'relative').find(
      (d) => d.slug === 'upper-back',
    )!;

    expect(region.color).toBe(sampleRamp(0.5));
    expect(region.color).not.toBe(sampleRamp(1));
  });

  it('paints an untrained region with the no-data neutral', () => {
    // Nothing in this log trains adductors.
    expect(agg.byMuscle.adductors.setsPerWeek).toBe(0);
    for (const side of ['front', 'back'] as const) {
      const adductors = buildBodyData(agg, side, 'relative').find(
        (d) => d.slug === 'adductors',
      )!;
      expect(adductors.color).toBe(NO_DATA_FILL);
    }
  });

  it('front and back disagree about the deltoids, as they should', () => {
    const front = buildBodyData(agg, 'front', 'relative').find((d) => d.slug === 'deltoids')!;
    const back = buildBodyData(agg, 'back', 'relative').find((d) => d.slug === 'deltoids')!;
    // front = max(front-delts 2.0625, side-delts 2.3125); back = rear-delts 2.1875
    expect(front.color).not.toBe(back.color);
  });
});

describe('musclesForSlug', () => {
  it('breaks a tapped region back into its muscles, busiest first', () => {
    expect(musclesForSlug(agg, 'back', 'upper-back').map((m) => m.muscle)).toEqual([
      'lats',
      'upper-back',
    ]);
    // Front delts (0.25/wk) outrank side delts (0.125/wk) in the fixture, so the
    // busiest-first ordering must put them in that order.
    expect(musclesForSlug(agg, 'front', 'deltoids').map((m) => m.muscle)).toEqual([
      'front-delts',
      'side-delts',
    ]);
  });

  it('returns nothing for a decorative region', () => {
    expect(musclesForSlug(agg, 'front', 'head')).toEqual([]);
    expect(musclesForSlug(agg, 'front', 'hair')).toEqual([]);
  });
});
