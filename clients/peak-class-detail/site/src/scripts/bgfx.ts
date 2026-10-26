// Site background: dark glossy paint under the studio's hexagon LED ceiling.
// The hexagon reflection slides and bends over the paint's curves as you scroll, leans toward the
// cursor, and metallic flakes twinkle in the clearcoat. Drawn small (half resolution or less),
// paused while a full-screen scene covers it or the tab is hidden.
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uT;
uniform float uScroll;
uniform vec2 uMouse;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// distance to the edges of a hexagon grid (0 on an edge)
float hexEdge(vec2 p){
  vec2 q = vec2(p.x * 1.1547005, p.y + p.x * 0.5773503);
  vec2 pi = floor(q), pf = fract(q);
  float v = mod(pi.x + pi.y, 3.0);
  float ca = step(1.0, v), cb = step(2.0, v);
  vec2 ma = step(pf.xy, pf.yx);
  return dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * asp, uv.y - 0.5);
  float s = uScroll, t = uT;

  // the paint: big soft body curves that roll past as you scroll
  float ys = p.y + s * 0.9;
  vec2 g = vec2(
    0.55 * cos(p.x * 1.6 + t * 0.05) * sin(ys * 1.1) + 0.25 * cos(p.x * 3.1 - ys * 2.3 + t * 0.07),
    0.55 * sin(p.x * 1.6 + t * 0.05) * cos(ys * 1.1) - 0.25 * cos(p.x * 3.1 - ys * 2.3 + t * 0.07) * 0.9
  );
  g += (uMouse - p) * 0.18 * exp(-length(uMouse - p) * 1.4); // the reflection leans toward the cursor

  // what the paint reflects: the hexagon ceiling, bent by the curves
  vec2 r = p * 2.4 + g * 1.4 + vec2(t * 0.012, s * 2.2);
  float e = hexEdge(r * 1.6);
  float tubes = exp(-e * 26.0);
  // only the parts of the body that face the light catch it, in broad patches
  float face = smoothstep(0.15, 0.95, 0.5 + 0.5 * sin(g.x * 2.2 + g.y * 1.7 + ys * 0.8 + 1.3));
  float light = tubes * face;
  // a long soft highlight running along the body line
  light += exp(-abs(g.y * 1.8 + p.y * 0.6 - 0.15) * 7.0) * 0.18 * face;

  // metallic flakes in the clearcoat
  vec2 cell = floor(gl_FragCoord.xy / 2.0);
  float h = hash(cell + floor(s * 3.0));
  float flake = step(0.9965, h) * (0.5 + 0.5 * sin(t * 2.4 + h * 80.0));

  vec3 base = vec3(0.023, 0.031, 0.043);
  vec3 col = base + vec3(0.62, 0.72, 0.95) * light * 0.26 + vec3(0.7, 0.8, 1.0) * flake * 0.26;
  // keep the middle calm for text, edges darker
  float vig = smoothstep(1.25, 0.2, length(p * vec2(0.8, 1.1)));
  col = mix(base * 0.7, col, 0.55 + 0.45 * vig);
  gl_FragColor = vec4(col, 1.0);
}`;

export function initBg(canvas: HTMLCanvasElement, covered: () => boolean = () => false) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return;
  const sh = (type: number, src: string) => { const o = gl.createShader(type)!; gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uT = U('uT'), uScroll = U('uScroll'), uMouse = U('uMouse');

  const coarse = matchMedia('(pointer: coarse)').matches;
  const scale = coarse ? 0.35 : 0.5; // small buffer, stretched: soft like a real reflection, cheap to draw
  // phones: ignore the address bar showing/hiding (height-only changes), rebuild only on real resizes
  let lw = 0, lh = 0;
  const resize = () => {
    if (coarse && innerWidth === lw && Math.abs(innerHeight - lh) < 160) return;
    lw = innerWidth; lh = innerHeight;
    canvas.width = Math.max(2, Math.round(innerWidth * scale));
    canvas.height = Math.max(2, Math.round(innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();
  addEventListener('resize', resize);

  let mx = 0.6, my = 0.2, tx = mx, ty = my;
  addEventListener('pointermove', (e) => {
    const a = innerWidth / innerHeight;
    tx = (e.clientX / innerWidth - 0.5) * a; ty = 0.5 - e.clientY / innerHeight;
  }, { passive: true });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  let sm = scrollY;
  const frame = () => {
    if (!document.hidden && !covered()) {
      sm += (scrollY - sm) * 0.12;
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      gl.uniform1f(uT, reduced ? 0 : (performance.now() - t0) / 1000);
      gl.uniform1f(uScroll, sm / innerHeight * 0.35);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (!reduced) requestAnimationFrame(frame);
  };
  frame();
  canvas.classList.add('is-on');
}
