// Web copies of the polishing pair. Usage: node tools/polish-images.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
const out = 'public/polish';
mkdirSync(out, { recursive: true });
const fx = 0.46; // light spot, focus of the phone crop
const shift = { corrected: [5, -5] };
for (const k of ['swirls', 'corrected']) {
  let src = `../source/polish/${k}.jpg`;
  const { width, height } = await sharp(src).metadata();
  if (shift[k]) {
    const [dx, dy] = shift[k], P = 32;
    const buf = await sharp(src).extend({ top: P, bottom: P, left: P, right: P, extendWith: 'copy' }).toBuffer();
    src = await sharp(buf).extract({ left: P + dx, top: P + dy, width, height }).jpeg({ quality: 95 }).toBuffer();
  }
  await sharp(src).resize(2560).webp({ quality: 74 }).toFile(`${out}/${k}-desktop.webp`);
  const w = Math.round((height * 9) / 16);
  const left = Math.max(0, Math.min(width - w, Math.round(width * fx - w / 2)));
  await sharp(src).extract({ left, top: 0, width: w, height }).resize(1080, 1920).webp({ quality: 74 }).toFile(`${out}/${k}-phone.webp`);
  console.log(k, 'ok');
}
