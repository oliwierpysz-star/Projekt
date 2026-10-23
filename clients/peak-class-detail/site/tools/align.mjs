// Measures how a dirty edit is shifted/scaled vs. its clean original (background only).
// Usage: node tools/align.mjs clean.jpg dirty.jpg
import sharp from 'sharp';
const W = 768, H = 432;
async function edges(f) {
  const { data } = await sharp(f).resize(W, H, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const g = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    g[i] = Math.abs(data[i + 1] - data[i - 1]) + Math.abs(data[i + W] - data[i - W]);
  }
  return g;
}
const [a, b] = await Promise.all([edges(process.argv[2]), edges(process.argv[3])]);
// background mask: top 40% of the frame (lights, house), away from the car
const y0 = 8, y1 = Math.round(H * 0.4), x0 = 20, x1 = W - 20;
function score(s, dx, dy) {
  let sum = 0, n = 0;
  const cx = W / 2, cy = H / 2;
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
    const bx = Math.round((x - cx) * s + cx + dx), by = Math.round((y - cy) * s + cy + dy);
    if (bx < 0 || by < 0 || bx >= W || by >= H) continue;
    sum += Math.abs(a[y * W + x] - b[by * W + bx]); n++;
  }
  return sum / n;
}
let best = { e: Infinity };
for (let s = 0.97; s <= 1.0301; s += 0.005) for (let dx = -10; dx <= 10; dx++) for (let dy = -10; dy <= 10; dy++) {
  const e = score(s, dx, dy);
  if (e < best.e) best = { e, s: +s.toFixed(3), dx, dy };
}
const base = score(1, 0, 0);
console.log(JSON.stringify({ aligned_error: +base.toFixed(2), best_error: +best.e.toFixed(2), scale: best.s, dx_px_at_4096: best.dx * 4096 / W, dy_px_at_4096: best.dy * 4096 / W }));
