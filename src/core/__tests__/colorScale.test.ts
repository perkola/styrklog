import {
  ABSOLUTE_CEILING,
  NO_DATA_FILL,
  muscleFill,
  sampleRamp,
  scalePosition,
} from '../colorScale';

describe('muscleFill', () => {
  it('gives an untrained muscle the neutral, not the coldest ramp step', () => {
    expect(muscleFill(0, 'relative', 5)).toBe(NO_DATA_FILL);
    expect(muscleFill(0, 'absolute', 5)).toBe(NO_DATA_FILL);
    // The distinction the whole map hangs on.
    expect(muscleFill(0.1, 'relative', 5)).not.toBe(NO_DATA_FILL);
  });

  it('paints the busiest muscle at the top of the ramp in relative mode', () => {
    expect(muscleFill(4.5625, 'relative', 4.5625)).toBe(sampleRamp(1));
  });

  it('keeps a modest muscle low on the ramp in absolute mode', () => {
    // 4.5 sets/week is the top of this log but well short of the 20/week ceiling,
    // so absolute mode must not flatter it the way relative mode does.
    const relative = scalePosition(4.5, 'relative', 4.5);
    const absolute = scalePosition(4.5, 'absolute', 4.5);
    expect(relative).toBe(1);
    expect(absolute).toBeCloseTo(0.225, 3);
  });
});

describe('scalePosition', () => {
  it('clamps above the absolute ceiling', () => {
    expect(scalePosition(ABSOLUTE_CEILING * 2, 'absolute', 50)).toBe(1);
  });

  it('survives an aggregation where nothing was trained', () => {
    expect(scalePosition(0, 'relative', 0)).toBe(0);
  });
});

describe('sampleRamp', () => {
  it('is monotone from light to dark', () => {
    const luminance = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
    };
    const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => luminance(sampleRamp(t)));
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThan(samples[i - 1]);
    }
  });

  it('returns the validated ramp endpoints', () => {
    expect(sampleRamp(0)).toBe('#86b6ef');
    expect(sampleRamp(1)).toBe('#104281');
  });

  it('clamps out-of-range input', () => {
    expect(sampleRamp(-1)).toBe(sampleRamp(0));
    expect(sampleRamp(2)).toBe(sampleRamp(1));
  });
});
