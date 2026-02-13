const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'node_modules', 'onnxruntime-web', 'dist');
const destDir = path.join(__dirname, '..', 'public');

const files = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort.wasm.min.js',
];

for (const file of files) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);

  if (!fs.existsSync(src)) {
    console.log(`[skip] ${file} not found in node_modules`);
    continue;
  }

  // 이미 최신이면 건너뜀
  if (fs.existsSync(dest)) {
    const srcStat = fs.statSync(src);
    const destStat = fs.statSync(dest);
    if (srcStat.size === destStat.size && srcStat.mtimeMs <= destStat.mtimeMs) {
      console.log(`[skip] ${file} already up to date`);
      continue;
    }
  }

  fs.copyFileSync(src, dest);
  console.log(`[copy] ${file} -> public/`);
}
