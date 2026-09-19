import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';

import { buildBodyData, type BodySide, type BodySlug } from '../core/bodySlugs';
import { BodyTapLayer } from './BodyTapLayer';
import { NO_DATA_FILL, type ScaleMode } from '../core/colorScale';
import type { Aggregation } from '../core/types';
import { T } from './tokens';

type Props = {
  aggregation: Aggregation;
  mode: ScaleMode;
  onPressMuscle: (side: BodySide, slug: string) => void;
};

/**
 * Compile-time guard that the slug union mirrored in src/core has not drifted
 * from the library's. Assignability requires BodySlug to be a subset of Slug,
 * so a slug we invent — or one the library drops — fails the typecheck here
 * rather than silently rendering nothing.
 */
const _slugDriftGuard: Slug[] = [] as BodySlug[];
void _slugDriftGuard;

/** Native size of the library's SVG at scale 1. */
const BODY_WIDTH = 200;

export function BodyHeatMap({ aggregation, mode, onPressMuscle }: Props) {
  const { width } = useWindowDimensions();
  // Two bodies side by side, inside the screen's horizontal padding.
  const scale = Math.min(1, (width - 56) / 2 / BODY_WIDTH);

  return (
    <View style={styles.row}>
      {(['front', 'back'] as const).map((side) => (
        <View key={side} style={styles.column}>
          {/* The library's onBodyPartPress cannot fire under react-native-web;
              BodyTapLayer handles taps instead. */}
          <BodyTapLayer onSlugPress={(slug) => onPressMuscle(side, slug)}>
            <Body
              side={side}
              gender="male"
              scale={scale}
              defaultFill={NO_DATA_FILL}
              border={T.baseline}
              // Typing the array as the library's own ExtendedBodyPart makes
              // TypeScript reject any slug that has drifted from its Slug union.
              data={buildBodyData(aggregation, side, mode) as ExtendedBodyPart[]}
            />
          </BodyTapLayer>
          <Text style={styles.caption}>{side === 'front' ? 'Front' : 'Back'}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  column: { alignItems: 'center' },
  caption: { fontSize: 12, color: T.inkMuted, marginTop: 4 },
});
