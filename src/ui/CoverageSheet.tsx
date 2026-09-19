import { StyleSheet, Text, View } from 'react-native';

import { MUSCLE_LABELS, type Aggregation } from '../core/types';
import { Sheet } from './Sheet';
import { T } from './tokens';

type Props = { aggregation: Aggregation | null; onClose: () => void };

/**
 * What the map is guessing at, and what it is ignoring outright.
 *
 * Without this the heat map would be quietly confident about training it had
 * never accounted for. Unmapped exercises contribute nothing; inferred ones do
 * contribute, but from a keyword guess rather than the curated table, so both
 * are listed and labelled separately.
 */
export function CoverageSheet({ aggregation, onClose }: Props) {
  const unmapped = aggregation?.unmapped ?? [];
  const inferred = aggregation?.inferred ?? [];

  return (
    <Sheet
      visible={aggregation != null}
      title="Exercise coverage"
      subtitle={`${unmapped.length} unmapped · ${inferred.length} inferred`}
      onClose={onClose}
    >
      {unmapped.length === 0 && inferred.length === 0 ? (
        <Text style={styles.clear}>
          Every exercise in this window maps to muscles from the curated table. Nothing
          is being guessed at or left out.
        </Text>
      ) : null}

      {unmapped.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading}>Not counted</Text>
          <Text style={styles.blurb}>
            These exercises are in your log but not in the mapping table, so they add
            nothing to the map.
          </Text>
          {unmapped.map((e) => (
            <View key={e.exercise} style={styles.row}>
              <Text style={styles.exercise}>{e.exercise}</Text>
              <Text style={styles.sets}>{e.sets}</Text>
            </View>
          ))}
        </View>
      )}

      {inferred.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading}>Counted, but guessed</Text>
          <Text style={styles.blurb}>
            Matched by keyword rather than the curated table. They do count toward the
            map — check the muscles look right.
          </Text>
          {inferred.map((e) => (
            <View key={e.exercise} style={styles.row}>
              <View style={styles.inferredText}>
                <Text style={styles.exercise}>{e.exercise}</Text>
                <Text style={styles.guess}>
                  {e.contributions
                    .map(
                      (c) =>
                        `${MUSCLE_LABELS[c.muscle]}${c.weight < 1 ? ` ×${c.weight}` : ''}`,
                    )
                    .join(' · ')}
                </Text>
              </View>
              <Text style={styles.sets}>{e.sets}</Text>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  clear: { fontSize: 14, color: T.inkSecondary, lineHeight: 20 },
  section: { marginBottom: 28 },
  heading: { fontSize: 15, fontWeight: '600', color: T.ink },
  blurb: { fontSize: 12, color: T.inkSecondary, marginTop: 4, marginBottom: 8, lineHeight: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.gridline,
  },
  inferredText: { flex: 1, paddingRight: 12 },
  exercise: { flex: 1, fontSize: 13, color: T.ink },
  guess: { fontSize: 11, color: T.inkMuted, marginTop: 2 },
  sets: { fontSize: 13, color: T.inkSecondary, fontVariant: ['tabular-nums'] },
});
