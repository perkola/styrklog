import type { ReactNode } from 'react';

type Props = { children: ReactNode; onSlugPress: (slug: string) => void };

/**
 * Native passthrough.
 *
 * On iOS the library's own `onBodyPartPress` works, because react-native-svg
 * wires React Native's responder system onto its shapes. Nothing extra needed.
 * See BodyTapLayer.web.tsx for why the web build cannot do the same.
 */
export function BodyTapLayer({ children }: Props) {
  return <>{children}</>;
}
