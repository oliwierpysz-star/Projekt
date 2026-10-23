// Builds web copies of the chosen hero images.
// Usage: node tools/hero-variants.mjs  (reads ../source/hero/clean-XX.jpg)
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';

// id: variant shown with ?hero=<id>; src: generated image number; fx: horizontal focus for the phone crop
// shift: how far the dirty edit sits from the clean one, in px of the 4096 original (measured with tools/align.mjs)
const variants = [
  { id: 'a', src: 'urus2', fx: 0.7, shift: [5, 0], patch: [[3282, 1332, 92, 84]] },
  { id: 'b', src: '09', fx: 0.64, shift: [5, 0] },
  { id: 'c', src: 'aventador', fx: 0.645, shift: [5, 0] },
  { id: 'd', src: '12', fx: 0.54, shift: [5, -5] },
  { id: 'e', src: 'se', fx: 0.5, shift: [0, -5], scale: 0.995 },
];

// move the dirty image back onto the clean one, filling the edge with copied pixels
async function aligned(src, [dx, dy], scale = 1) {
  const P = 32;
  const { width, height } = await sharp(src).metadata();
  if (scale !== 1) {
    // dirty edit came out slightly smaller/larger: rescale around the centre first
    const W = Math.round(width / scale), H = Math.round(height / scale);
    const big = await sharp(src).resize(W, H).toBuffer();
    src = await sharp(big).extract({ left: Math.round((W - width) / 2), top: Math.round((H - height) / 2), width, height }).jpeg({ quality: 95 }).toBuffer();
  }
  const buf = await sharp(src).extend({ top: P, bottom: P, left: P, right: P, extendWith: 'copy' }).toBuffer();
  return sharp(buf).extract({ left: P + dx, top: P + dy, width, height }).jpeg({ quality: 95 }).toBuffer();
}

// paste the clean badge onto the dirty car so it doesn't morph under the light bar
async function patched(dirty, cleanFile, rects = []) {
  let img = dirty;
  for (const [x, y, w, h] of rects) {
    const piece = await sharp(cleanFile).extract({ left: x, top: y, width: w, height: h }).ensureAlpha().raw().toBuffer();
    // soft oval mask, 92% opacity
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = (i - w / 2) / (w / 2), dy = (j - h / 2) / (h / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      piece[(j * w + i) * 4 + 3] = Math.round(235 * Math.max(0, Math.min(1, (1 - d) / 0.35)));
    }
    const over = await sharp(piece, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    img = await sharp(img).composite([{ input: over, left: x, top: y }]).jpeg({ quality: 95 }).toBuffer();
  }
  return img;
}

for (const v of variants) {
  const dir = `public/hero/${v.id}`;
  mkdirSync(dir, { recursive: true });
  for (const kind of ['clean', 'dirty']) {
    const file = `../source/hero/${kind}-${v.src}.jpg`;
    if (!existsSync(file)) continue;
    const src = kind === 'dirty' ? await patched(await aligned(file, v.shift, v.scale), `../source/hero/clean-${v.src}.jpg`, v.patch) : file;
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
  const cut = `../source/hero/cutout-${v.src}.png`;
  if (existsSync(cut)) {
    await sharp(cut).resize(2560, 1440, { fit: 'fill' }).ensureAlpha().png().toFile(`${dir}/mask-desktop.png`); // only its alpha is used
    console.log(v.id, 'mask ok');
  }
}
