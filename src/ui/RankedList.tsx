import { Pressable, StyleSheet, Text, View } from 'react-native';

import { muscleFill, type ScaleMode } from '../core/colorScale';
import { MUSCLE_LABELS, type Aggregation, type MuscleStat } from '../core/types';
import { T } from './tokens';

type Props = {
  aggregation: Aggregation;
  mode: ScaleMode;
  onSelect: (stat: MuscleStat) => void;
};

/**
 * The ranked table. Doubles as the accessible reading of the map: the ramp's
 * lighter steps sit below 3:1 against the surface, and the documented relief
 * for that is a labelled table view, which this is.
 */
export function RankedList({ aggregation, mode, onSelect }: Props) {
  const { ranked, maxSetsPerWeek } = aggregation;

  return (
    <View style={styles.root}>
      {ranked.map((stat) => {
        const untrained = stat.setsPerWeek <= 0;
        const fraction = maxSetsPerWeek > 0 ? stat.setsPerWeek / maxSetsPerWeek : 0;

        return (
          <Pressable
            key={stat.muscle}
            onPress={() => onSelect(stat)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${MUSCLE_LABELS[stat.muscle]}, ${stat.setsPerWeek.toFixed(
              1,
            )} sets per week`}
          >
            <Text style={styles.name} numberOfLines={1}>
              {MUSCLE_LABELS[stat.muscle]}
            </Text>

            <View style={styles.track}>
              {!untrained && (
                <View
                  style={[
                    styles.bar,
                    {
                      // Always leave a sliver visible so a small value still reads
                      // as a value rather than as nothing.
                      width: `${Math.max(2, fraction * 100)}%`,
                      backgroundColor: muscleFill(stat.setsPerWeek, mode, maxSetsPerWeek),
                    },
                  ]}
                />
              )}
            </View>

            <Text style={[styles.value, untrained && styles.valueMuted]}>
              {untrained ? '—' : stat.setsPerWeek.toFixed(1)}
            </Text>
          </Pressable>
        );
      })}
      <Text style={styles.footnote}>sets per week · tap a muscle for detail</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // 2px of surface between adjacent bars.
    paddingVertical: 1,
    minHeight: 30,
  },
  rowPressed: { backgroundColor: T.plane },
  name: { width: 92, fontSize: 13, color: T.ink },
  track: {
    flex: 1,
    height: 10,
    justifyContent: 'center',
  },
  bar: { height: 10, borderRadius: 4 },
  value: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    color: T.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  valueMuted: { color: T.inkMuted },
  footnote: { fontSize: 11, color: T.inkMuted, marginTop: 8 },
});
