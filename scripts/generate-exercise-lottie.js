/**
 * Generate Lottie JSON animation files for exercise guide stickman animations.
 * Each file is a 200x200 canvas, 30fps, 2-second loop with smooth ease-in-out.
 *
 * Usage: node scripts/generate-exercise-lottie.js
 */

const fs = require('fs')
const path = require('path')

// #7C3AED in normalized RGBA
const COLOR = [0.486, 0.227, 0.929, 1]
const STROKE_W = 7
const HEAD_D = 18 // head diameter

// --- Keyframe helpers ---

function shapeKF(t, vertices, isLast) {
  const z = vertices.map(() => [0, 0])
  const kf = { t, s: [{ i: z, o: z, v: vertices, c: false }] }
  if (!isLast) {
    kf.i = { x: 0.58, y: 1 }
    kf.o = { x: 0.42, y: 0 }
  }
  return kf
}

function posKF(t, pos, isLast) {
  const kf = { t, s: pos }
  if (!isLast) {
    kf.i = { x: [0.58, 0.58], y: [1, 1] }
    kf.o = { x: [0.42, 0.42], y: [0, 0] }
  }
  return kf
}

// --- Shape builders ---

function makePath(name, vA, vB) {
  return {
    ty: 'gr',
    it: [
      {
        ind: 0,
        ty: 'sh',
        d: 1,
        ks: {
          a: 1,
          k: [shapeKF(0, vA), shapeKF(30, vB), shapeKF(60, vA, true)],
        },
        nm: name,
      },
      {
        ty: 'st',
        c: { a: 0, k: COLOR },
        o: { a: 0, k: 100 },
        w: { a: 0, k: STROKE_W },
        lc: 2, // round cap
        lj: 2, // round join
        bm: 0,
        nm: 'Stroke',
      },
      {
        ty: 'tr',
        p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] },
        r: { a: 0, k: 0 },
        o: { a: 0, k: 100 },
      },
    ],
    nm: name,
    np: 2,
    cix: 2,
    bm: 0,
  }
}

function makeHead(pA, pB) {
  return {
    ty: 'gr',
    it: [
      {
        d: 1,
        ty: 'el',
        s: { a: 0, k: [HEAD_D, HEAD_D] },
        p: {
          a: 1,
          k: [posKF(0, pA), posKF(30, pB), posKF(60, pA, true)],
        },
        nm: 'Head',
      },
      {
        ty: 'fl',
        c: { a: 0, k: COLOR },
        o: { a: 0, k: 100 },
        r: 1,
        bm: 0,
        nm: 'Fill',
      },
      {
        ty: 'tr',
        p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] },
        r: { a: 0, k: 0 },
        o: { a: 0, k: 100 },
      },
    ],
    nm: 'Head',
    np: 2,
    cix: 2,
    bm: 0,
  }
}

// --- Build full animation ---

function buildAnimation(name, a, b) {
  const shapes = [
    // Head first (rendered on top in Lottie shape layer order)
    makeHead(a.head, b.head),
    // Spine: neck → hip center
    makePath('Spine', [a.neck, a.hipC], [b.neck, b.hipC]),
    // Shoulder bar
    makePath('Shoulders', [a.sL, a.sR], [b.sL, b.sR]),
    // Arms (connected path: shoulder → elbow → wrist)
    makePath('L Arm', [a.sL, a.eL, a.wL], [b.sL, b.eL, b.wL]),
    makePath('R Arm', [a.sR, a.eR, a.wR], [b.sR, b.eR, b.wR]),
    // Hip bar
    makePath('Hips', [a.hL, a.hR], [b.hL, b.hR]),
    // Legs (connected path: hip → knee → ankle)
    makePath('L Leg', [a.hL, a.kL, a.aL], [b.hL, b.kL, b.aL]),
    makePath('R Leg', [a.hR, a.kR, a.aR], [b.hR, b.kR, b.aR]),
  ]

  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    nm: name,
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'Stickman',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [0, 0, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes,
        ip: 0,
        op: 60,
        st: 0,
        bm: 0,
      },
    ],
    markers: [],
  }
}

// --- Pose data ---
// Each pose: { head, neck, sL, sR, eL, eR, wL, wR, hipC, hL, hR, kL, kR, aL, aR }
// All coordinates in 200×200 canvas

function P(head, neck, sL, sR, eL, eR, wL, wR, hipC, hL, hR, kL, kR, aL, aR) {
  return { head, neck, sL, sR, eL, eR, wL, wR, hipC, hL, hR, kL, kR, aL, aR }
}

const STANDING = P(
  [100, 24], [100, 38],
  [80, 44], [120, 44],
  [72, 68], [128, 68],
  [70, 90], [130, 90],
  [100, 98],
  [88, 98], [112, 98],
  [88, 136], [112, 136],
  [88, 174], [112, 174]
)

const exercises = {
  squat: {
    name: 'Squat',
    a: STANDING,
    b: P(
      [100, 48], [100, 63],
      [80, 69], [120, 69],
      [66, 86], [134, 86],
      [70, 108], [130, 108],
      [100, 116],
      [84, 116], [116, 116],
      [74, 148], [126, 148],
      [86, 174], [114, 174]
    ),
  },
  lunge: {
    name: 'Lunge',
    a: STANDING,
    b: P(
      [93, 28], [93, 43],
      [71, 49], [115, 49],
      [63, 73], [123, 73],
      [66, 95], [120, 95],
      [93, 103],
      [81, 103], [105, 103],
      [60, 140], [118, 118],
      [52, 174], [128, 174]
    ),
  },
  pushup: {
    name: 'Push-up',
    // Side view: body horizontal, arms vertical
    a: P(
      [32, 74], [46, 77],
      [55, 77], [55, 77],
      [49, 100], [49, 100],
      [51, 120], [51, 120],
      [120, 79],
      [120, 79], [120, 79],
      [152, 79], [152, 79],
      [178, 79], [178, 79]
    ),
    b: P(
      [32, 100], [46, 103],
      [55, 103], [55, 103],
      [44, 118], [44, 118],
      [48, 136], [48, 136],
      [120, 105],
      [120, 105], [120, 105],
      [152, 105], [152, 105],
      [178, 105], [178, 105]
    ),
  },
  bridge: {
    name: 'Bridge',
    // Side view: lying on back, head on left
    a: P(
      [24, 108], [38, 108],
      [45, 108], [45, 108],
      [34, 98], [34, 98],
      [27, 92], [27, 92],
      [100, 110],
      [100, 110], [100, 110],
      [138, 94], [138, 94],
      [164, 112], [164, 112]
    ),
    b: P(
      [24, 108], [38, 100],
      [45, 96], [45, 96],
      [34, 94], [34, 94],
      [27, 92], [27, 92],
      [100, 78],
      [100, 78], [100, 78],
      [138, 86], [138, 86],
      [164, 112], [164, 112]
    ),
  },
  crunch: {
    name: 'Crunch',
    // Side view: lying flat, then upper body curls up
    a: P(
      [28, 98], [42, 100],
      [50, 100], [50, 100],
      [36, 88], [36, 88],
      [28, 82], [28, 82],
      [110, 104],
      [110, 104], [110, 104],
      [146, 88], [146, 88],
      [168, 104], [168, 104]
    ),
    b: P(
      [50, 68], [57, 76],
      [64, 82], [64, 82],
      [50, 70], [50, 70],
      [44, 64], [44, 64],
      [110, 104],
      [110, 104], [110, 104],
      [146, 88], [146, 88],
      [168, 104], [168, 104]
    ),
  },
  shoulder_stretch: {
    name: 'Shoulder Stretch',
    a: STANDING,
    b: P(
      [100, 24], [100, 38],
      [80, 44], [120, 44],
      [68, 22], [132, 22],
      [78, 6], [122, 6],
      [100, 98],
      [88, 98], [112, 98],
      [88, 136], [112, 136],
      [88, 174], [112, 174]
    ),
  },
}

// --- Generate files ---

const outDir = path.join(__dirname, '..', 'public', 'animations')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

for (const [id, ex] of Object.entries(exercises)) {
  const lottie = buildAnimation(ex.name, ex.a, ex.b)
  const filePath = path.join(outDir, `exercise-${id}.json`)
  fs.writeFileSync(filePath, JSON.stringify(lottie), 'utf8')
  console.log(`Generated: exercise-${id}.json`)
}

console.log('Done! Generated', Object.keys(exercises).length, 'files in', outDir)
