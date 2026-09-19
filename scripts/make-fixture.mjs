/**
 * Generates the committed test fixture.
 *
 * The real StrengthLog export is personal data (bodyweight, training dates) and
 * is deliberately gitignored, so the suite runs against this synthetic stand-in
 * instead. It is built to exercise every quirk the parser has to survive:
 * the duplicate `calories` header, quoted workout names containing commas, a
 * U+2019 apostrophe, all eight set shapes, and warm-up/failure flags.
 */
import { writeFileSync } from 'fs';

const HEADER = [
  'workout','start','end','exercise','weight','bodyweight','assistingWeight','extraWeight',
  'distanceKM','distanceM','height','reps','rpm','time-per-500','calories','time',
  'warmup','max','fail','checked','setComment','workoutComment','form','sleep','calories','stress',
];

const at = (iso) => Date.parse(iso + 'T18:00:00Z');

// Spread so each window selects a different slice: 8w reaches back to 05-05,
// 12w to 04-07, and "all" spans the whole range.
const WORKOUTS = [
  { name: 'Tuesday Evening: Back, Biceps, Abs etc.', day: '2026-06-30' },
  { name: 'Friday Morning: Chest, Shoulders, Triceps etc.', day: '2026-06-26' },
  { name: 'Saturday Lunch: Legs, Calves etc.', day: '2026-06-20' },
  { name: 'Wednesday Evening: Back, Shoulders etc.', day: '2026-06-10' },
  { name: 'Monday Afternoon: Full body, Core etc.', day: '2026-05-20' },
  { name: 'Sunday Morning: Chest, Back etc.', day: '2026-04-15' },
  { name: 'Sunday Evening: Legs, Arms etc.', day: '2026-03-01' },
];

const BW = 80;
const rows = [];
let checked = 0;

function add(w, exercise, fields = {}) {
  const start = at(w.day);
  const end = start + 3600_000;
  const r = Object.fromEntries(HEADER.map((h) => [h, '']));
  r.workout = w.name;
  r.start = String(start);
  r.end = String(end);
  r.exercise = exercise;
  r.warmup = 'false';
  r.max = 'false';
  r.fail = 'false';
  r.checked = String(start + ++checked * 60_000);
  Object.assign(r, fields);
  rows.push(r);
}

const [w1, w2, w3, w4, w5, w6, w7] = WORKOUTS;

// --- shape 1: weight + reps (the common case), incl. a warm-up and a failure set
add(w1, 'Lat Pulldown', { weight: '40', reps: '10', warmup: 'true' });
add(w1, 'Lat Pulldown', { weight: '70', reps: '8' });
add(w1, 'Lat Pulldown', { weight: '70', reps: '7', fail: 'true' });
add(w1, 'Barbell Row', { weight: '60', reps: '10' });
// Keeps lats clear of upper-back so the shared back region has an unambiguous max.
add(w1, 'Lat Pulldown', { weight: '70', reps: '6' });
add(w1, 'Dumbbell Curl', { weight: '14', reps: '10' });
// --- shape 2: bodyweight + reps, with the U+2019 exercise name
add(w1, 'Captain’s Chair Knee Raises', { bodyweight: String(BW), reps: '12' });
// --- shape 3: bodyweight + time
add(w1, 'Plank', { bodyweight: String(BW), time: '00:01:30' });

add(w2, 'Smith Machine Incline Bench Press', { weight: '30', reps: '10', warmup: 'true' });
add(w2, 'Smith Machine Incline Bench Press', { weight: '60', reps: '8' });
add(w2, 'Machine Chest Fly', { weight: '35', reps: '12' });
add(w2, 'Cable Lateral Raise', { weight: '5', reps: '12' });
add(w2, 'Triceps Pushdown With Bar', { weight: '25', reps: '10' });
// --- shape 4: bodyweight + reps
add(w2, 'Push-Up', { bodyweight: String(BW), reps: '15' });

add(w3, 'Leg Press', { weight: '120', reps: '12' });
add(w3, 'Seated Leg Curl', { weight: '50', reps: '10' });
add(w3, 'Smith Machine Calf Raise', { weight: '60', reps: '15' });
// --- shape 5: bodyweight + height + reps
add(w3, 'Box Step-Up', { bodyweight: String(BW), height: '0.5', reps: '10' });
// --- shape 6: weight + distanceM
add(w3, 'Farmers Walk', { weight: '30', distanceM: '20' });

add(w4, 'Barbell Row', { weight: '65', reps: '8' });
// --- shape 7: bodyweight + assistingWeight + reps
add(w4, 'Pull-Up', { bodyweight: String(BW), assistingWeight: '20', reps: '8' });
// --- shape 8: bodyweight + extraWeight + reps
add(w4, 'Back Extension', { bodyweight: String(BW), extraWeight: '10', reps: '12' });
add(w4, 'Reverse Machine Fly', { weight: '30', reps: '12' });
// Pushes rear delts clear of front delts, so the front and back views of the
// shared `deltoids` slug must resolve to different colours.
add(w4, 'Face Pull', { weight: '20', reps: '15' });

add(w5, 'Romanian Deadlift', { weight: '80', reps: '8' });
add(w5, 'Dumbbell Shrug', { weight: '24', reps: '12' });
// --- cardio: distanceKM + time, with a calories value in the FIRST calories column
add(w5, 'Rowing (Machine)', { distanceKM: '2', time: '00:10:00', calories: '95' });
add(w5, 'Cable Crunch', { weight: '30', reps: '15' });

// Outside the 8-week window, inside 12 weeks.
add(w6, 'Machine Chest Press', { weight: '50', reps: '10' });
add(w6, 'Lat Pulldown', { weight: '65', reps: '10' });

// Outside 12 weeks; only "all time" sees these.
add(w7, 'Leg Extension', { weight: '45', reps: '12' });
add(w7, 'Hammer Curl', { weight: '12', reps: '10' });

const quote = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = [
  HEADER.join(','),
  ...rows.map((r) => HEADER.map((h, i) =>
    // The header repeats `calories`; only the first (cardio) one carries a value.
    quote(h === 'calories' && i === 24 ? '' : r[h])).join(',')),
].join('\n') + '\n';

writeFileSync('fixtures/sample-export.csv', csv);
console.log(`wrote fixtures/sample-export.csv — ${rows.length} sets, ${WORKOUTS.length} workouts`);
