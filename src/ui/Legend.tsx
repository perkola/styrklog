import { StyleSheet, Text, View } from 'react-native';

import {
  ABSOLUTE_CEILING,
  NO_DATA_FILL,
  sampleRamp,
  VOLUME_LANDMARKS,
  type ScaleMode,
} from '../core/colorScale';
import { T } from './tokens';

const SWATCHES = 24;
const ramp = Array.from({ length: SWATCHES }, (_, i) => sampleRamp(i / (SWATCHES - 1)));

type Props = { mode: ScaleMode; maxSetsPerWeek: number; topMuscle: string };

/**
 * The ramp, its end labels, and the untrained neutral.
 *
 * The absolute sets-per-week figure appears in BOTH modes so switching the
 * scale never hides the underlying number — relative mode changes how the
 * colour is assigned, not what is being measured.
 */
export function Legend({ mode, maxSetsPerWeek, topMuscle }: Props) {
  const ceiling = mode === 'absolute' ? ABSOLUTE_CEILING : maxSetsPerWeek;

  return (
    <View style={styles.root}>
      <View style={styles.rampRow}>
        {ramp.map((color, i) => (
          <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
      </View>

      <View style={styles.axis}>
        <Text style={styles.axisLabel}>0</Text>
        <Text style={styles.axisLabel}>
          {ceiling.toFixed(1)} sets/wk
          {mode === 'relative' ? ` · ${topMuscle}` : ''}
        </Text>
      </View>

      {mode === 'absolute' ? (
        <Text style={styles.landmarks}>
          {VOLUME_LANDMARKS.map((l) => `${l.at} ${l.label}`).join('  ·  ')}
        </Text>
      ) : (
        <Text style={styles.landmarks}>scaled to your busiest muscle</Text>
      )}

      <View style={styles.noDataRow}>
        <View style={styles.noDataSwatch} />
        <Text style={styles.axisLabel}>not trained in this window</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', paddingHorizontal: 4 },
  rampRow: { flexDirection: 'row', height: 10, borderRadius: 4, overflow: 'hidden' },
  swatch: { flex: 1 },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: { fontSize: 12, color: T.inkMuted, fontVariant: ['tabular-nums'] },
  landmarks: { fontSize: 11, color: T.inkMuted, marginTop: 2 },
  noDataRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  noDataSwatch: {
    width: 14,
    height: 10,
    borderRadius: 3,
    backgroundColor: NO_DATA_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.baseline,
  },
});
