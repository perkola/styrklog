# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v58.0.0/ before writing any code.

# Styrklog

Offline web app (Expo / React Native Web, deployed as a home-screen PWA): imports a StrengthLog CSV and renders a muscle
heat map. See `README.md` for behaviour and deployment.

## Commands

- `npm test` — Jest, runs under plain Node
- `npm run typecheck` — `tsc --noEmit`
- `npm run build:web` — production PWA build into `dist/`

Run tests and typecheck before finishing a change.

## Layout

- `src/core/` — pure TypeScript, no React Native imports. All logic lives here and is unit-tested.
  - `parseCsv.ts` CSV → `SetRow[]`
  - `exerciseMuscleMap.ts` exercise → muscles
  - `aggregate.ts` sets + window → sets/week per muscle
  - `colorScale.ts`, `bodySlugs.ts` values → colours and renderer slugs
- `src/ui/` — React Native components, rendered in the browser via react-native-web.
- `scripts/` — fixture, icon and web-build generators.

## Rules

- **Never commit personal data.** The repo is public. Real exports go in `fixtures/` and
  are gitignored; only the synthetic `fixtures/sample-export.csv` is tracked. Don't add
  keys, tokens or workout data anywhere.
- Keep the app offline: no backend, network calls, or analytics. The only
  persistence is a localStorage cache of the last imported CSV, so a reload
  doesn't lose your file — nothing else is stored and nothing leaves the
  device.
- Keep logic in `src/core` and add tests there for any behaviour change.
- Time windows anchor to the latest workout in the file, never `Date.now()`.
- To support a new exercise, add a row to the table in `exerciseMuscleMap.ts`; the tests
  require every fixture exercise to resolve via the table, not heuristics.
- Changing `scripts/make-fixture.mjs` changes the fixture and therefore test expectations.
  Recompute expected values independently rather than copying the code's output.

## Gotchas

- The CSV header has two `calories` columns; `parseCsv.ts` works by column index.
- Exercise names use U+2019 apostrophes; normalise before lookup.
- `react-native-body-highlighter` ignores `defaultFill`; uncoloured regions render near
  black, so `bodySlugs.ts` colours decorative slugs explicitly.
- The web target only: no native build. Picked files are read with `fetch` on the blob URL.
- Web builds must be served from the domain root (absolute `/_expo/...` paths).
