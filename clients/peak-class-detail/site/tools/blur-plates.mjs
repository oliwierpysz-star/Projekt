// Blurs licence plates on the full-car photos used on the site.
// Usage: node tools/blur-plates.mjs <src.jpg> <out.jpg> x,y,w,h [x,y,w,h ...]
import sharp from 'sharp';
const [src, out, ...rects] = process.argv.slice(2);
const layers = [];
for (const r of rects) {
  const [left, top, width, height] = r.split(',').map(Number);
  const piece = await sharp(src).extract({ left, top, width, height }).blur(28).toBuffer();
  layers.push({ input: piece, left, top });
}
await sharp(src).composite(layers).jpeg({ quality: 90 }).toFile(out);
console.log('ok', out);
