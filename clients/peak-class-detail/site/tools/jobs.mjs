// Builds every job ("realizacja") from his Instagram material:
//   photos -> src/assets/jobs/<slug>/NN.jpg   (licence plates blurred)
//   clips  -> public/jobs/<slug>/vN.mp4 + .webp poster   (trimmed to the plate-free part, no audio)
//   list   -> src/data/jobs.json
// Usage: node tools/jobs.mjs        (ffmpeg on PATH)
// Photos are picked by their number in the sorted source/photos folder (see the contact sheet),
// clips by their number in the sorted source/videos folder. Adding files there shifts the numbers.
import sharp from 'sharp';
import { readdirSync, mkdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PH = '../source/photos', VD = '../source/videos';
const photos = readdirSync(PH).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
const videos = readdirSync(VD).filter((f) => /\.mp4$/i.test(f)).sort();

// [photo number, plate box as fractions x0,y0,x1,y1 (optional)]; the first photo is the cover
// clips: [video number, start, end as fractions of its length, optional fixed blur box in px]
// or { social: 'name' } to reuse a clip already cut for the site
const jobs = [
  { slug: 'audi-s5', make: 'Audi', model: 'S5', what: 'Detailing lakieru i wnętrza',
    photos: [[33, [0.04, 0.73, 0.29, 0.86]], [31, [0.84, 0.71, 1, 0.89]], [28, [0.54, 0.38, 0.86, 0.54]], [29], [30], [27, [0.82, 0.78, 1, 0.95]], [32]],
    clips: [[2, 0, 1]] },
  { slug: 'golf-gti', make: 'Golf', model: 'GTI', what: 'Korekta lakieru i pielęgnacja całego wnętrza',
    photos: [[58, [0.68, 0.73, 0.91, 0.87]], [54, [0.31, 0.76, 0.69, 0.86]], [55, [0, 0.57, 0.12, 0.73]], [56], [57]],
    clips: [[13, 0, 1], [12, 0, 0.7], [14, 0.3, 0.85]] },
  { slug: 'mercedes-a45', make: 'Mercedes', model: 'A45', what: 'Full detail z aplikacją wosku',
    photos: [[44, [0.08, 0.66, 0.32, 0.78]], [45, [0.7, 0.61, 0.89, 0.71]], [46], [47], [48]],
    clips: [[9, 0.25, 1]] },
  { slug: 'bmw-f11', make: 'BMW', model: 'F11', what: 'Full detail: lakier, dekontaminacja i wnętrze',
    photos: [[38, [0.67, 0.68, 0.87, 0.79]], [36], [37]],
    clips: [[7, 0, 1]] },
  { slug: 'bmw-f45', make: 'BMW', model: 'F45', what: 'Kompleksowa metamorfoza',
    photos: [[35, [0.73, 0.78, 0.92, 0.87]], [34, [0.3, 0.67, 0.68, 0.77]]],
    clips: [[5, 0, 0.48], [3, 0.62, 1], [4, 0, 1]] },
  { slug: 'audi-a6', make: 'Audi', model: 'A6 C7', what: '',
    photos: [[26, [0, 0.66, 0.16, 0.78]], [24], [25]],
    clips: [[1, 0, 1, [290, 950, 560, 300]]] },
  { slug: 'audi-a3', make: 'Audi', model: 'A3 8P', what: 'Czyszczenie, impregnacja i zabezpieczenie skórzanych foteli',
    photos: [[53, [0.65, 0.75, 0.91, 0.88]], [49], [50], [51], [52]],
    clips: [[10, 0.65, 1], [11, 0, 0.72]] },
  { slug: 'ford-raptor', make: 'Ford', model: 'Raptor', what: 'Detailing zewnętrzny i pielęgnacja wnętrza',
    photos: [[63, [0.34, 0.8, 0.68, 0.89]], [62]],
    clips: [{ social: 'raptor' }] },
  { slug: 'kia-optima', make: 'Kia', model: 'Optima', what: '',
    photos: [[59], [60], [61]],
    clips: [{ social: 'optima' }, { social: 'optima-rear' }] },
  { slug: 'kia-sportage-gt', make: 'Kia', model: 'Sportage GT-Line', what: '',
    photos: [[43, [0.13, 0.63, 0.33, 0.73]], [39, [0, 0.75, 0.12, 0.9]], [40, [0.54, 0.55, 0.84, 0.7]], [41], [42], [5]],
    clips: [] },
  { slug: 'kia-sportage', make: 'Kia', model: 'Sportage', what: '',
    photos: [[17, [0.1, 0.72, 0.27, 0.81]], [18, [0.01, 0.7, 0.33, 0.93]], [19, [0.63, 0.63, 0.87, 0.77]], [20]],
    clips: [] },
  { slug: 'alfa-giulietta', make: 'Alfa Romeo', model: 'Giulietta', what: '',
    photos: [[6, [0.24, 0.68, 0.54, 0.8]], [7], [8], [9], [10]],
    clips: [] },
  { slug: 'ssangyong-tivoli', make: 'SsangYong', model: 'Tivoli', what: '',
    photos: [[11, [0.12, 0.7, 0.4, 0.85]], [12, [0.77, 0.46, 1, 0.65]], [13], [15]],
    clips: [] },
];

const only = process.argv[2]; // optional: one slug
const out = [];
for (const j of jobs) {
  const pdir = `src/assets/jobs/${j.slug}`, vdir = `public/jobs/${j.slug}`;
  mkdirSync(pdir, { recursive: true }); mkdirSync(vdir, { recursive: true });
  const ph = [];
  for (const [k, [n, box]] of j.photos.entries()) {
    const name = `${String(k + 1).padStart(2, '0')}.jpg`;
    ph.push(name);
    if (only && only !== j.slug) continue;
    const src = `${PH}/${photos[n - 1]}`;
    let img = sharp(src).rotate();
    if (box) {
      const { width, height } = await sharp(src).rotate().metadata();
      const [x0, y0, x1, y1] = box;
      const left = Math.round(x0 * width), top = Math.round(y0 * height);
      const w = Math.min(width - left, Math.round((x1 - x0) * width)), h = Math.min(height - top, Math.round((y1 - y0) * height));
      const piece = await sharp(src).rotate().extract({ left, top, width: w, height: h }).blur(Math.max(14, w / 12)).toBuffer();
      img = sharp(await sharp(src).rotate().composite([{ input: piece, left, top }]).toBuffer());
    }
    await img.resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(`${pdir}/${name}`);
  }
  const cl = [];
  for (const [k, c] of j.clips.entries()) {
    const name = `v${k + 1}`;
    cl.push(name);
    if (only && only !== j.slug) continue;
    if ('social' in c) {
      copyFileSync(`public/media/social/${c.social}.mp4`, `${vdir}/${name}.mp4`);
      copyFileSync(`public/media/social/${c.social}.webp`, `${vdir}/${name}.webp`);
      continue;
    }
    const [n, a, b, blur] = c;
    const src = `${VD}/${videos[n - 1]}`;
    const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString());
    const ss = (a * dur).toFixed(2), t = ((b - a) * dur).toFixed(2);
    const vf = blur
      ? `[0:v]split[m][c];[c]crop=${blur[2]}:${blur[3]}:${blur[0]}:${blur[1]},boxblur=24:3[b];[m][b]overlay=${blur[0]}:${blur[1]},scale=540:-2[o]`
      : `[0:v]scale=540:-2[o]`;
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-ss', ss, '-t', t, '-i', src, '-filter_complex', vf, '-map', '[o]', '-an', '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${vdir}/${name}.mp4`]);
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', `${vdir}/${name}.mp4`, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '72', `${vdir}/${name}.webp`]);
  }
  out.push({ slug: j.slug, make: j.make, model: j.model, what: j.what, photos: ph, clips: cl });
  console.log(j.slug, ph.length, 'photos', cl.length, 'clips');
}
mkdirSync('src/data', { recursive: true });
if (!only) writeFileSync('src/data/jobs.json', JSON.stringify(out, null, 2) + '\n');
