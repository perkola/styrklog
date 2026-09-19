// Builds the app icon from the real body artwork, so the home-screen icon is the
// same drawing the app itself shows rather than a generic placeholder.
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';

const require = createRequire(import.meta.url);
const front = require('react-native-body-highlighter/dist/assets/bodyFront.js');
const parts = front.default ?? Object.values(front)[0];

const BG = '#0d366b';
const BODY = '#1c5cab';
// Muscle fills, picked from the app's own validated ramp so the icon and the map
// speak the same language.
const FILL = {
  trapezius: '#4a8ae0',
  deltoids: '#b7d3f6',
  chest: '#9ec5f4',
  abs: '#6da7ec',
  obliques: '#5598e7',
  biceps: '#86b6ef',
  triceps: '#86b6ef',
  forearm: '#5598e7',
};

const paths = [];
for (const part of parts) {
  const fill = FILL[part.slug] ?? BODY;
  for (const key of ['common', 'left', 'right']) {
    for (const d of part.path?.[key] ?? []) {
      paths.push(`<path d="${d}" fill="${fill}"/>`);
    }
  }
}

// Frame shoulders-to-abs only. The full figure turns to mush at the ~60px an
// iOS home screen actually renders, so the head and legs are cropped away and
// the remaining shapes are left large and chunky.
const CX = 366;
const CY = 448;
const SCALE = 2.4;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<rect width="1024" height="1024" fill="${BG}"/>
<g transform="translate(512 512) scale(${SCALE}) translate(${-CX} ${-CY})">
${paths.join('\n')}
</g>
</svg>`;

mkdirSync('web', { recursive: true });
writeFileSync('web/icon.svg', svg);
console.log(`wrote web/icon.svg (${paths.length} paths, ${(svg.length / 1024).toFixed(0)} KB)`);
