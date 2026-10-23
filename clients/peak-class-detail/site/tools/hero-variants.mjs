// Builds web copies of the chosen hero images.
// Usage: node tools/hero-variants.mjs  (reads ../source/hero/clean-XX.jpg)
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';

// id: variant shown with ?hero=<id>; src: generated image number; fx: horizontal focus for the phone crop
// shift: how far the dirty edit sits from the clean one, in px of the 4096 original (measured with tools/align.mjs)
const variants = [
  { id: 'a', src: '09', fx: 0.64, shift: [5, 0] },
  { id: 'b', src: '08', fx: 0.5, shift: [5, 0] },
  { id: 'c', src: '12', fx: 0.54, shift: [5, -5] },
];

// move the dirty image back onto the clean one, filling the edge with copied pixels
async function aligned(src, [dx, dy]) {
  const P = 32;
  const { width, height } = await sharp(src).metadata();
  const buf = await sharp(src).extend({ top: P, bottom: P, left: P, right: P, extendWith: 'copy' }).toBuffer();
  return sharp(buf).extract({ left: P + dx, top: P + dy, width, height }).jpeg({ quality: 95 }).toBuffer();
}

for (const v of variants) {
  const dir = `public/hero/${v.id}`;
  mkdirSync(dir, { recursive: true });
  for (const kind of ['clean', 'dirty']) {
    const file = `../source/hero/${kind}-${v.src}.jpg`;
    if (!existsSync(file)) continue;
    const src = kind === 'dirty' ? await aligned(file, v.shift) : file;
    const img = sharp(src);
    const { width, height } = await img.metadata();
    await sharp(src).resize(2560).webp({ quality: 74 }).toFile(`${dir}/${kind}-desktop.webp`);
    const phoneSrc = `../source/hero/${kind}-${v.src}-phone.jpg`;
    if (existsSync(phoneSrc)) {
      await sharp(phoneSrc).resize(1080, 1920, { fit: 'cover' }).webp({ quality: 74 }).toFile(`${dir}/${kind}-phone.webp`);
    } else {
      // no tall version yet: crop a 9:16 slice around the car
      const w = Math.round((height * 9) / 16);
      const left = Math.max(0, Math.min(width - w, Math.round(width * v.fx - w / 2)));
      await sharp(src).extract({ left, top: 0, width: w, height }).resize(1080, 1920).webp({ quality: 74 }).toFile(`${dir}/${kind}-phone.webp`);
    }
    console.log(v.id, kind, 'ok');
  }
}
