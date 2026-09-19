import type { ReactNode } from 'react';

type Props = { children: ReactNode; onSlugPress: (slug: string) => void };

/**
 * Web tap handling for the body map.
 *
 * react-native-svg's `onPress` rides on React Native's responder system, which
 * react-native-web does not wire onto SVG elements — the props arrive at the DOM
 * as unknown `onResponder*` attributes and are dropped, so the library's
 * `onBodyPartPress` never fires in a browser.
 *
 * The library does set `id={slug}` on every rendered path, so a single delegated
 * click listener on the wrapper recovers the same information without patching
 * the library or hit-testing coordinates ourselves.
 */
export function BodyTapLayer({ children, onSlugPress }: Props) {
  return (
    <div
      onClick={(event) => {
        const slug = (event.target as SVGElement | null)?.id;
        if (slug) onSlugPress(slug);
      }}
    >
      {children}
    </div>
  );
}
