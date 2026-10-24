// Web copies of the four route-step images (../source/route/1-4.jpg, 3:4).
// Usage: node tools/route-images.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
mkdirSync('public/route', { recursive: true });
for (const n of [1, 2, 3, 4]) {
  for (const w of [480, 900]) {
    await sharp(`../source/route/${n}.jpg`).resize(w, Math.round((w * 4) / 3), { fit: 'cover' }).webp({ quality: 72 }).toFile(`public/route/${n}-${w}.webp`);
  }
  console.log(n, 'ok');
}
