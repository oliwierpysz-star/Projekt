// "Spójrz bliżej": black paint under an inspection lamp. Swirls glow as rings around the light;
// after correction they fade and the reflection turns into a crisp point.
const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform vec2 uLamp;     // lamp position in uv
uniform float uFix;     // 0 = swirls, 1 = corrected
uniform float uTime;

float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}

// one layer of swirl marks: short concentric arcs around the light at random radii
float arcs(float r, float a, float scale, float seed){
  float rr = r * scale;
  float id = floor(rr);
  float f = fract(rr);
  float on = step(0.55, h1(id + seed));
  float start = h1(id * 1.7 + seed) * 6.2832;
  float len = 0.4 + h1(id * 3.1 + seed) * 1.6;
  float da = mod(a - start, 6.2832);
  float seg = smoothstep(0.0, 0.15, da) * smoothstep(len, len - 0.25, da);
  float w = 0.06 + 0.06 * h1(id * 5.3 + seed);
  float line = smoothstep(w, 0.0, abs(f - 0.5));
  return on * seg * line;
}

void main(){
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = vUv * asp;
  vec2 L = uLamp * asp;
  vec2 d = p - L;
  float r = length(d);
  float a = atan(d.y, d.x);

  // base: deep black paint with a faint blue-grey body and a soft reflection of an LED tube
  vec3 col = vec3(0.012, 0.015, 0.02);
  float tube = exp(-pow((vUv.y - 0.78 - (vUv.x - 0.5) * 0.12) * 18.0, 2.0)) * 0.10;
  col += vec3(0.75, 0.82, 1.0) * tube;
  col += vec3(0.02, 0.03, 0.05) * (1.0 - vUv.y);

  // lamp reflection: blurry and smeared before, crisp point after
  float hazeR = mix(0.20, 0.07, uFix);
  float halo = exp(-r * r / (hazeR * hazeR)) * mix(0.55, 0.30, uFix);
  float core = exp(-r * mix(55.0, 140.0, uFix)) * mix(0.9, 1.5, uFix);
  col += vec3(0.9, 0.95, 1.0) * (halo + core);

  // swirls (holograms): visible in the light's falloff zone
  float zone = exp(-r * 3.2) * smoothstep(0.004, 0.05, r);
  float s = arcs(r, a, 140.0, 1.0) * 0.9 + arcs(r, a + 0.7, 260.0, 7.0) * 0.6 + arcs(r, a - 1.3, 75.0, 3.0) * 0.5;
  // random straight micro-scratches catching light
  vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * p * vec2(3.0, 220.0);
  float sc = smoothstep(0.985, 1.0, vnoise(q)) * 0.8;
  float swirl = (s + sc) * zone * (1.0 - uFix);
  col += vec3(0.85, 0.9, 1.0) * swirl * 1.4;
  // faint rainbow sheen typical of holograms
  col += vec3(0.25, 0.1, 0.35) * swirl * 0.25 * (0.5 + 0.5 * sin(a * 3.0 + r * 40.0));

  // fine metallic flake, always present
  float flake = h2(floor(vUv * uRes / 2.0));
  col += vec3(0.5, 0.6, 0.8) * step(0.996, flake) * exp(-r * 4.0) * 0.6;

  // vignette
  col *= 1.0 - 0.35 * pow(length(vUv - 0.5) * 1.3, 2.0);
  gl_FragColor = vec4(col, 1.0);
}`;

export function initLampGL(panel: HTMLElement) {
  const canvas = panel.querySelector<HTMLCanvasElement>('[data-lamp-gl]')!;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;
  const sh = (t: number, s: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uLamp = U('uLamp'), uFix = U('uFix'), uTime = U('uTime');

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  // lamp follows the pointer; when idle it drifts slowly on its own
  const lamp = { x: 0.35, y: 0.55 }, target = { x: 0.35, y: 0.55 };
  let lastMove = -1e9, fix = 0, fixTarget = 0;
  panel.addEventListener('pointermove', (e) => {
    const b = canvas.getBoundingClientRect();
    target.x = (e.clientX - b.left) / b.width;
    target.y = 1 - (e.clientY - b.top) / b.height;
    lastMove = performance.now();
    panel.classList.add('is-touched');
  });

  const buttons = panel.querySelectorAll<HTMLButtonElement>('[data-lamp-mode]');
  buttons.forEach((b) => b.addEventListener('click', () => {
    fixTarget = Number(b.dataset.lampMode);
    buttons.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));

  let raf = 0, visible = false;
  const t0 = performance.now();
  const frame = (now: number) => {
    raf = 0;
    if (!visible) return;
    const t = (now - t0) / 1000;
    if (now - lastMove > 2500) {
      target.x = 0.5 + Math.sin(t * 0.35) * 0.3;
      target.y = 0.5 + Math.sin(t * 0.52 + 1.2) * 0.22;
    }
    lamp.x += (target.x - lamp.x) * 0.12;
    lamp.y += (target.y - lamp.y) * 0.12;
    fix += (fixTarget - fix) * 0.06;
    gl.uniform2f(uLamp, lamp.x, lamp.y);
    gl.uniform1f(uFix, fix);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }, { rootMargin: '100px' }).observe(canvas);
}
