// Hero: scroll washes the car. Two matched stills (dirty / clean), a vertical LED bar sweeps across.
const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D tDirty;
uniform sampler2D tClean;
uniform vec2 uCover;   // uv scale for object-fit: cover
uniform float uBar;    // bar position in screen x (0..1), may run past the edges
uniform float uTime;
uniform float uAspect;
uniform float uProc;
uniform float uFoam;   // 0..1 snow foam rising from the bottom
uniform float uRinse;  // 0..1 rinse from the top, revealing the page background
uniform vec3 uBg;   // 1 = no dirty photo yet: fake the mud from the clean one

float hash(float n){ return fract(sin(n) * 43758.5453); }
float noise(float x){ float i = floor(x); float f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vn(p); p *= 2.03; a *= 0.5; } return v; }
// voronoi: x = distance to nearest cell point, y = distance to second nearest, zw = offset to nearest
vec4 vor(vec2 x){
  vec2 n = floor(x), f = fract(x), mo = vec2(0.0);
  float f1 = 8.0, f2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(h2(n + g), h2(n + g + 17.3));
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < f1) { f2 = f1; f1 = d; mo = r; } else if (d < f2) { f2 = d; }
  }
  return vec4(sqrt(f1), sqrt(f2), mo);
}
// round bubble walls at one scale: thin soft rings around random centres
float rings(vec2 q, float sc, float seed){
  vec4 v = vor(q * sc + seed);
  return smoothstep(0.30, 0.37, v.x) * smoothstep(0.47, 0.39, v.x);
}
float specs(vec2 q, float sc, float seed){
  vec4 v = vor(q * sc + seed);
  return smoothstep(0.09, 0.0, length(v.zw + vec2(0.14, -0.16)));
}
// creamy snow foam: mostly white, low-contrast bubble texture, bigger bubbles near the crest
vec3 foamColor(vec2 q, float crest){
  vec3 c = vec3(0.90, 0.92, 0.95);
  c *= 1.0 - 0.10 * rings(q, 90.0, 0.0) - 0.08 * rings(q, 45.0, 5.3) - (0.06 + 0.14 * crest) * rings(q, 20.0, 9.1);
  c += vec3(0.18) * specs(q, 45.0, 5.3) + vec3(0.25) * specs(q, 20.0, 9.1) * crest;
  return c;
}
vec3 fakeDirt(vec3 c, vec2 uv){
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // dusty film: flatter, warmer, highlights dulled
  vec3 dust = mix(vec3(lum), c, 0.35) * vec3(1.08, 0.97, 0.82);
  dust = mix(dust, vec3(0.30, 0.26, 0.21), 0.28) * 0.9;
  // splashes: heavier low down, spared on the bright light bars
  float n = fbm(uv * vec2(7.0, 11.0)) * 0.7 + fbm(uv * vec2(28.0, 40.0)) * 0.3;
  float low = smoothstep(0.35, 0.9, uv.y);
  float m = smoothstep(0.52 - low * 0.18, 0.72 - low * 0.18, n) * (1.0 - smoothstep(0.7, 0.92, lum));
  vec3 mud = vec3(0.26, 0.2, 0.14) * (0.55 + 0.6 * fbm(uv * 60.0));
  return mix(dust, mud, m * 0.85);
}

void main(){
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  uv.y = 1.0 - uv.y;
  // water-sheet edge: the wipe line wobbles a little along y
  float wob = (noise(vUv.y * 9.0 + uTime * 0.6) - 0.5) * 0.018 + (noise(vUv.y * 31.0 - uTime) - 0.5) * 0.006;
  float x = vUv.x + wob;
  float clean = 1.0 - smoothstep(uBar - 0.004, uBar + 0.004, x);
  vec3 cl = texture2D(tClean, uv).rgb;
  vec3 dirty = uProc > 0.5 ? fakeDirt(cl, uv) : texture2D(tDirty, uv).rgb;
  // freshly washed band behind the bar looks wetter: lift highlights
  float wet = smoothstep(0.22, 0.0, uBar - x) * clean;
  cl += pow(max(cl - 0.45, 0.0), vec3(1.5)) * wet * 1.6;
  vec3 col = mix(dirty, cl, clean);
  // the LED bar itself
  float d = abs(x - uBar) * uAspect;
  float core = exp(-d * 900.0);
  float glow = exp(-d * 60.0) * 0.35 + exp(-d * 14.0) * 0.08;
  float flick = 0.92 + 0.08 * noise(uTime * 14.0);
  float vis = smoothstep(-0.02, 0.02, uBar) * smoothstep(1.02, 0.98, uBar);
  col += vec3(0.86, 0.92, 1.0) * (core + glow) * flick * vis;

  // snow foam: rises from the bottom with a lumpy edge
  if (uFoam > 0.0) {
    vec2 q = vec2(vUv.x * uAspect, vUv.y);
    float edge = (fbm(vec2(q.x * 3.0, uTime * 0.15)) - 0.5) * 0.22 + (vn(vec2(q.x * 14.0, 3.0)) - 0.5) * 0.05;
    float front = uFoam * 1.4 - 0.2;
    float fm = smoothstep(front + 0.015, front - 0.015, vUv.y - edge);
    float crest = smoothstep(front - 0.16, front, vUv.y - edge);
    vec3 foam = foamColor(q + vec2(0.0, -uTime * 0.008), crest);
    foam *= 0.86 + 0.14 * fbm(q * 3.0);                                    // soft lumps
    foam *= vec3(1.0 - 0.22 * crest, 1.0 - 0.18 * crest, 1.0 - 0.1 * crest); // cooler shadow under the crest
    foam *= 0.82 + 0.18 * vUv.y;                                            // a little darker at the bottom
    col = mix(col, foam, fm);
  }
  // rinse: a sheet of water runs down from the top and leaves the page background behind
  if (uRinse > 0.0) {
    float wob = (fbm(vec2(vUv.x * uAspect * 4.0, uTime * 0.4)) - 0.5) * 0.1;
    float front = 1.1 - uRinse * 1.3;
    float rm = smoothstep(front - 0.01, front + 0.01, vUv.y + wob);
    float sheen = exp(-abs(vUv.y + wob - front) * 90.0) * (1.0 - step(1.0, uRinse));
    col = mix(col, uBg, rm);
    col += vec3(0.7, 0.8, 1.0) * sheen * 0.5;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export async function initHeroGL(canvas: HTMLCanvasElement, getState: () => { wash: number; foam: number; rinse: number }, variant: string, front?: HTMLCanvasElement) {
  // preserveDrawingBuffer lets the cut-out layer copy this frame after it is drawn
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!front });
  if (!gl) return null;
  const portrait = matchMedia('(orientation: portrait)').matches;
  const set = portrait ? 'phone' : 'desktop';
  const clean = await loadImage(`/hero/${variant}/clean-${set}.webp`);
  const dirty = await loadImage(`/hero/${variant}/dirty-${set}.webp`).catch(() => null);
  // optional cut-out mask: the car is redrawn above the title
  const mask = front && set === 'desktop' ? await loadImage(`/hero/${variant}/mask-desktop.png`).catch(() => null) : null;
  const fctx = mask ? front!.getContext('2d') : null;
  if (fctx) front!.closest('.hero')?.classList.add('has-front');

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = (img: HTMLImageElement, unit: number) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  };
  tex(dirty || clean, 0);
  tex(clean, 1);
  gl.uniform1f(gl.getUniformLocation(prog, 'uProc'), dirty ? 0 : 1);
  gl.uniform1i(gl.getUniformLocation(prog, 'tDirty'), 0);
  gl.uniform1i(gl.getUniformLocation(prog, 'tClean'), 1);
  const uCover = gl.getUniformLocation(prog, 'uCover');
  const uBar = gl.getUniformLocation(prog, 'uBar');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uAspect = gl.getUniformLocation(prog, 'uAspect');
  const uFoam = gl.getUniformLocation(prog, 'uFoam');
  const uRinse = gl.getUniformLocation(prog, 'uRinse');
  gl.uniform3f(gl.getUniformLocation(prog, 'uBg'), 6 / 255, 8 / 255, 11 / 255);
  const imgAspect = clean.width / clean.height;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const a = w / h;
    // cover: scale uv so the image fills the canvas
    gl.uniform2f(uCover, a > imgAspect ? 1 : a / imgAspect, a > imgAspect ? imgAspect / a : 1);
    gl.uniform1f(uAspect, a);
    if (fctx) { front!.width = canvas.width; front!.height = canvas.height; }
  };
  resize();
  addEventListener('resize', resize);

  let raf = 0, visible = true;
  const t0 = performance.now();
  const frame = () => {
    raf = 0;
    if (!visible) return;
    // bar travels from just off the left edge to just off the right edge
    const st = getState();
    gl.uniform1f(uBar, -0.04 + st.wash * 1.08);
    gl.uniform1f(uFoam, st.foam);
    gl.uniform1f(uRinse, st.rinse);
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (fctx && mask) {
      const W = front!.width, H = front!.height, a = W / H;
      // same cover crop as the shader, applied to the mask
      const sw = a > imgAspect ? mask.width : mask.height * a;
      const sh = a > imgAspect ? mask.width / a : mask.height;
      fctx.globalCompositeOperation = 'copy';
      fctx.drawImage(canvas, 0, 0);
      fctx.globalCompositeOperation = 'destination-in';
      fctx.drawImage(mask, (mask.width - sw) / 2, (mask.height - sh) / 2, sw, sh, 0, 0, W, H);
    }
    raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(canvas);
  raf = requestAnimationFrame(frame);
  return true;
}
