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
uniform float uProc;   // 1 = no dirty photo yet: fake the mud from the clean one

float hash(float n){ return fract(sin(n) * 43758.5453); }
float noise(float x){ float i = floor(x); float f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vn(p); p *= 2.03; a *= 0.5; } return v; }
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

export async function initHeroGL(canvas: HTMLCanvasElement, getProgress: () => number, variant: string) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const portrait = matchMedia('(orientation: portrait)').matches;
  const set = portrait ? 'phone' : 'desktop';
  const clean = await loadImage(`/hero/${variant}/clean-${set}.webp`);
  const dirty = await loadImage(`/hero/${variant}/dirty-${set}.webp`).catch(() => null);

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
  };
  resize();
  addEventListener('resize', resize);

  let raf = 0, visible = true;
  const t0 = performance.now();
  const frame = () => {
    raf = 0;
    if (!visible) return;
    // bar travels from just off the left edge to just off the right edge
    const p = getProgress();
    gl.uniform1f(uBar, -0.04 + p * 1.08);
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(canvas);
  raf = requestAnimationFrame(frame);
  return true;
}
