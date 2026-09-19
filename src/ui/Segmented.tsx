import { Pressable, StyleSheet, Text, View } from 'react-native';

import { T } from './tokens';

type Props<K extends string> = {
  options: ReadonlyArray<{ key: K; label: string }>;
  value: K;
  onChange: (key: K) => void;
};

/** Filters sit in one row above the chart, per the interaction spec. */
export function Segmented<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <View style={styles.root}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.item, active && styles.itemActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: T.plane,
    borderRadius: 9,
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.gridline,
  },
  item: { flex: 1, paddingVertical: 6, borderRadius: 7, alignItems: 'center' },
  itemActive: { backgroundColor: T.surface, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  label: { fontSize: 13, color: T.inkSecondary },
  labelActive: { color: T.ink, fontWeight: '600' },
});
