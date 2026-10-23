// "Rysy znikają": scroll drives a polishing pad over swirled black paint.
// Behind the pad the corrected photo shows through; at the end the whole panel is corrected.
const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const N = 64; // samples along the pad's path
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tBefore;
uniform sampler2D tAfter;
uniform vec2 uCover;
uniform float uAspect;   // canvas w / h
uniform float uProg;     // 0..1 scroll progress of the polishing
uniform float uTime;
uniform vec2 uSpot;      // light spot in image uv (focus of the swirls)
uniform float uR;        // pad radius (in height units)

const int N = ${N};

// path of the pad: a spiral outwards from the light spot, in screen space (x scaled by aspect)
uniform float uAspectP;
vec2 pathAt(float t, vec2 c){
  float a = t * 6.2832 * 3.2;
  float r = 0.05 + t * 0.62;
  float sx = 1.25 * min(uAspectP, 1.0);
  return c + vec2(cos(a) * r * sx, sin(a) * r * 0.75);
}
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }

void main(){
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  uv.y = 1.0 - uv.y;
  vec3 before = texture2D(tBefore, uv).rgb;
  vec3 after = texture2D(tAfter, uv).rgb;

  // screen position of the spot
  vec2 spotScreen = (vec2(uSpot.x, 1.0 - uSpot.y) - 0.5) / uCover + 0.5;
  vec2 P = vec2(vUv.x * uAspect, vUv.y);
  vec2 C = vec2(spotScreen.x * uAspect, spotScreen.y);

  // how much of the path has been travelled
  float head = clamp(uProg / 0.85, 0.0, 1.0);
  float clean = 0.0;
  for (int i = 0; i < N; i++) {
    float t = float(i) / float(N - 1);
    if (t > head) break;
    float d = length(P - pathAt(t, C));
    clean = max(clean, smoothstep(uR * 1.05, uR * 0.55, d));
  }
  // the rest of the panel finishes in the last part of the scroll
  clean = max(clean, smoothstep(0.85, 1.0, uProg));
  vec3 col = mix(before, after, clean);

  // the pad itself: a spinning foam disc with a soft shadow, only while polishing
  float on = smoothstep(0.0, 0.03, uProg) * (1.0 - smoothstep(0.84, 0.9, uProg));
  vec2 H = pathAt(head, C);
  vec2 d = P - H;
  float r = length(d);
  // spinning blue foam pad on a dark backing plate
  float sp = uTime * 22.0;
  vec2 rd = mat2(cos(sp), -sin(sp), sin(sp), cos(sp)) * d;
  float foamTex = vn(rd / uR * 9.0) * 0.6 + vn(rd / uR * 26.0) * 0.4;
  float disc = smoothstep(uR, uR * 0.95, r);
  vec3 pad = vec3(0.16, 0.30, 0.78) * (0.65 + 0.55 * foamTex);
  pad *= 1.0 - 0.45 * smoothstep(uR * 0.6, uR, r);                    // rounded foam edge
  pad += vec3(0.35, 0.45, 0.7) * smoothstep(uR * 0.9, 0.0, length(d + vec2(uR * 0.35, -uR * 0.35))) * 0.35; // top-left sheen
  // seen from above: a big black backing plate, the blue foam only as a ring around it
  float plate = smoothstep(uR * 0.8, uR * 0.77, r);
  vec3 plateCol = vec3(0.055, 0.06, 0.07) + 0.04 * vn(rd / uR * 30.0);
  plateCol += vec3(0.08) * smoothstep(uR * 0.8, uR * 0.5, r) * smoothstep(uR * 0.3, uR * 0.6, r) * (0.5 + 0.5 * sin(atan(rd.y, rd.x) * 24.0)); // spun grooves
  // a white index mark smeared into an arc by the spin
  float ang = atan(d.y, d.x) - mod(sp, 6.2832);
  float arc = smoothstep(1.4, 0.0, mod(ang, 6.2832)) * smoothstep(uR * 0.06, 0.0, abs(r - uR * 0.6));
  plateCol += vec3(0.55) * arc;
  pad = mix(pad, plateCol, plate);
  pad = mix(pad, vec3(0.32), smoothstep(uR * 0.1, uR * 0.08, r));  // centre nut
  float shadow = smoothstep(uR * 1.35, uR * 0.8, length(d - vec2(uR * 0.12, -uR * 0.18)));
  col *= 1.0 - shadow * 0.6 * on;
  col = mix(col, pad, disc * on);

  gl_FragColor = vec4(col, 1.0);
}`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export async function initPolishGL(canvas: HTMLCanvasElement, getProgress: () => number) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return false;
  const set = matchMedia('(orientation: portrait)').matches ? 'phone' : 'desktop';
  const [before, after] = await Promise.all([loadImage(`/polish/swirls-${set}.webp`), loadImage(`/polish/corrected-${set}.webp`)]);

  const sh = (t: number, s: string) => {
    const o = gl.createShader(t)!;
    gl.shaderSource(o, s);
    gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || 'shader');
    return o;
  };
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

  const tex = (img: HTMLImageElement, unit: number) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  };
  tex(before, 0);
  tex(after, 1);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  gl.uniform1i(U('tBefore'), 0);
  gl.uniform1i(U('tAfter'), 1);
  // light spot of the swirl photo: on the phone crop it sits in the middle
  gl.uniform2f(U('uSpot'), set === 'phone' ? 0.5 : 0.45, 0.44);
  const uCover = U('uCover'), uAspect = U('uAspect'), uProg = U('uProg'), uTime = U('uTime'), uR = U('uR');
  const imgAspect = before.width / before.height;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const a = w / h;
    gl.uniform2f(uCover, a > imgAspect ? 1 : a / imgAspect, a > imgAspect ? imgAspect / a : 1);
    gl.uniform1f(uAspect, a);
    gl.uniform1f(gl.getUniformLocation(prog, 'uAspectP'), a);
    gl.uniform1f(uR, a < 1 ? 0.11 : 0.15);
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  let raf = 0, visible = false;
  const t0 = performance.now();
  const frame = () => {
    raf = 0;
    if (!visible) return;
    gl.uniform1f(uProg, getProgress());
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(canvas);
  return true;
}
