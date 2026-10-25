import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { aggregate, WINDOW_LABELS } from '../core/aggregate';
import { musclesForSlug, type BodySide } from '../core/bodySlugs';
import type { ScaleMode } from '../core/colorScale';
import { MUSCLE_LABELS, type MuscleStat, type SetRow, type WindowKey } from '../core/types';
import { BodyHeatMap } from './BodyHeatMap';
import { CoverageSheet } from './CoverageSheet';
import { pickAndParseCsv } from './importCsv';
import { loadLastImport } from './lastImport';
import { Legend } from './Legend';
import { MuscleDetailSheet } from './MuscleDetailSheet';
import { RankedList } from './RankedList';
import { Segmented } from './Segmented';
import { T } from './tokens';

const WINDOWS = (['1w', '1m', 'ytd', '1y'] as const).map((key) => ({
  key,
  label: WINDOW_LABELS[key],
}));

const MODES: ReadonlyArray<{ key: ScaleMode; label: string }> = [
  { key: 'relative', label: 'Relative' },
  { key: 'absolute', label: 'Absolute' },
];

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function HomeScreen() {
  // Seed from the cached last import, if any, instead of starting empty.
  // The ref makes sure loadLastImport() — a JSON.parse plus a full CSV parse
  // — runs exactly once per mount, not once per useState initializer below.
  const cachedRef = useRef<ReturnType<typeof loadLastImport> | undefined>(undefined);
  if (cachedRef.current === undefined) cachedRef.current = loadLastImport();

  const [sets, setSets] = useState<SetRow[] | null>(() => cachedRef.current?.sets ?? null);
  const [fileName, setFileName] = useState(() => cachedRef.current?.fileName ?? '');
  const [windowKey, setWindowKey] = useState<WindowKey>('1m');
  const [mode, setMode] = useState<ScaleMode>('relative');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MuscleStat[] | null>(null);
  const [coverageOpen, setCoverageOpen] = useState(false);

  const aggregation = useMemo(
    () => (sets ? aggregate(sets, windowKey) : null),
    [sets, windowKey],
  );

  async function run(loader: () => Promise<{ sets: SetRow[]; fileName: string } | null>) {
    setBusy(true);
    setError(null);
    try {
      const result = await loader();
      if (result) {
        setSets(result.sets);
        setFileName(result.fileName);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  }

  if (!aggregation) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.empty}>
          <Text style={styles.brand}>Styrklog</Text>
          <Text style={styles.pitch}>
            Import a StrengthLog CSV export to see how your training volume is spread
            across muscle groups — and which ones you have been neglecting.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.primary} onPress={() => run(pickAndParseCsv)} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={T.surface} />
            ) : (
              <Text style={styles.primaryLabel}>Import CSV export</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const coverageCount = aggregation.unmapped.length + aggregation.inferred.length;
  // Spell out both ends: the window is anchored to the last workout in the
  // file, not to today, and that is surprising unless the dates are visible.
  const windowLabel = `${WINDOW_LABELS[windowKey]} · ${fmtDate(
    aggregation.windowStart,
  )} – ${fmtDate(aggregation.anchor)}`;

  const onPressMuscle = (side: BodySide, slug: string) => {
    const stats = musclesForSlug(aggregation, side, slug);
    if (stats.length > 0) setSelected(stats);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.brand}>Styrklog</Text>
          <Pressable onPress={() => run(pickAndParseCsv)} hitSlop={8}>
            <Text style={styles.link}>Import</Text>
          </Pressable>
        </View>

        <Text style={styles.summary}>
          {aggregation.workouts} workouts · {aggregation.workingSets} working sets
        </Text>
        {/* The window is anchored to the last workout in the FILE, so say which
            date that is — otherwise a months-old export looks simply empty. */}
        <Text style={styles.windowLabel}>{windowLabel}</Text>
        <Text style={styles.source} numberOfLines={1}>
          {fileName}
        </Text>

        <View style={styles.filters}>
          <Segmented options={WINDOWS} value={windowKey} onChange={setWindowKey} />
          <Segmented options={MODES} value={mode} onChange={setMode} />
        </View>

        <View style={styles.mapBlock}>
          <BodyHeatMap
            aggregation={aggregation}
            mode={mode}
            onPressMuscle={onPressMuscle}
          />
        </View>

        <Legend
          mode={mode}
          maxSetsPerWeek={aggregation.maxSetsPerWeek}
          topMuscle={
            aggregation.ranked[0] ? MUSCLE_LABELS[aggregation.ranked[0].muscle] : ''
          }
        />

        <Pressable
          style={[styles.coverage, coverageCount > 0 && styles.coverageWarn]}
          onPress={() => setCoverageOpen(true)}
        >
          <Text style={styles.coverageText}>
            {coverageCount === 0
              ? 'All exercises mapped'
              : `${aggregation.unmapped.length} unmapped · ${aggregation.inferred.length} inferred`}
          </Text>
          <Text style={styles.link}>Review</Text>
        </Pressable>

        <RankedList aggregation={aggregation} mode={mode} onSelect={(s) => setSelected([s])} />
      </ScrollView>

      <MuscleDetailSheet
        stats={selected}
        aggregation={aggregation}
        mode={mode}
        windowLabel={windowLabel}
        onClose={() => setSelected(null)}
      />
      <CoverageSheet
        aggregation={coverageOpen ? aggregation : null}
        onClose={() => setCoverageOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.surface },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  brand: { fontSize: 26, fontWeight: '700', color: T.ink },
  pitch: { fontSize: 15, color: T.inkSecondary, lineHeight: 21 },
  error: { fontSize: 13, color: '#d03b3b' },
  primary: {
    backgroundColor: T.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryLabel: { color: T.surface, fontSize: 16, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  link: { color: T.accent, fontSize: 14, fontWeight: '500' },
  summary: { fontSize: 14, color: T.ink, marginTop: 2 },
  windowLabel: { fontSize: 13, color: T.inkSecondary, marginTop: 1 },
  source: { fontSize: 11, color: T.inkMuted, marginTop: 1 },

  filters: { gap: 8, marginTop: 14 },
  mapBlock: { marginTop: 18, marginBottom: 14 },

  coverage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: T.plane,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.gridline,
  },
  coverageWarn: { borderColor: T.warning },
  coverageText: { fontSize: 13, color: T.inkSecondary },
});
