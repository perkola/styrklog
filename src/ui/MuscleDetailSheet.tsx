import { StyleSheet, Text, View } from 'react-native';

import { ABSOLUTE_CEILING, muscleFill, type ScaleMode } from '../core/colorScale';
import { MUSCLE_LABELS, type Aggregation, type MuscleStat } from '../core/types';
import { Sheet } from './Sheet';
import { T } from './tokens';

type Props = {
  stats: MuscleStat[] | null;
  aggregation: Aggregation;
  mode: ScaleMode;
  windowLabel: string;
  onClose: () => void;
};

/**
 * What a region is actually made of.
 *
 * A tapped region can stand for more than one muscle — the back's upper-back
 * path covers lats and rhomboids — so each is broken out with its own figure.
 * The map takes the max of them; this is where the parts become visible again.
 */
export function MuscleDetailSheet({ stats, aggregation, mode, windowLabel, onClose }: Props) {
  const visible = stats != null && stats.length > 0;
  const title = visible ? stats.map((s) => MUSCLE_LABELS[s.muscle]).join(' · ') : '';

  return (
    <Sheet visible={visible} title={title} subtitle={windowLabel} onClose={onClose}>
      {stats?.map((stat) => (
        <View key={stat.muscle} style={styles.block}>
          <View style={styles.headline}>
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: muscleFill(
                    stat.setsPerWeek,
                    mode,
                    aggregation.maxSetsPerWeek,
                  ),
                },
              ]}
            />
            <Text style={styles.muscle}>{MUSCLE_LABELS[stat.muscle]}</Text>
            <Text style={styles.figure}>{stat.setsPerWeek.toFixed(1)}</Text>
            <Text style={styles.unit}>sets/wk</Text>
          </View>

          <Text style={styles.context}>
            {stat.totalSets === 0
              ? 'Nothing in this window trained it.'
              : `${formatSets(stat.totalSets)} over ${aggregation.weeks.toFixed(
                  aggregation.weeks % 1 === 0 ? 0 : 1,
                )} weeks · ${Math.round(
                  (stat.setsPerWeek / ABSOLUTE_CEILING) * 100,
                )}% of the ${ABSOLUTE_CEILING}/wk reference`}
          </Text>

          {stat.exercises.length > 0 && (
            <View style={styles.table}>
              {stat.exercises.map((e) => (
                <View key={e.exercise} style={styles.tableRow}>
                  <Text style={styles.exercise} numberOfLines={2}>
                    {e.exercise}
                  </Text>
                  <Text style={styles.sets}>
                    {e.sets}
                    {e.contribution < 1 ? ` ×${e.contribution}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </Sheet>
  );
}

function formatSets(n: number): string {
  const rounded = n % 1 === 0 ? String(n) : n.toFixed(1);
  return `${rounded} weighted set${n === 1 ? '' : 's'}`;
}

const styles = StyleSheet.create({
  block: { marginBottom: 28 },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  chip: { width: 12, height: 12, borderRadius: 3, alignSelf: 'center' },
  muscle: { flex: 1, fontSize: 15, fontWeight: '600', color: T.ink },
  figure: { fontSize: 24, fontWeight: '600', color: T.ink },
  unit: { fontSize: 12, color: T.inkMuted },
  context: { fontSize: 12, color: T.inkSecondary, marginTop: 4 },
  table: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.gridline,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.gridline,
  },
  exercise: { flex: 1, fontSize: 13, color: T.ink, paddingRight: 12 },
  sets: { fontSize: 13, color: T.inkSecondary, fontVariant: ['tabular-nums'] },
});
