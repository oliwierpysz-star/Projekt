// "Rysy znikają": scroll grows a circle of corrected paint out of the light spot.
const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tBefore;
uniform sampler2D tAfter;
uniform vec2 uCover;
uniform float uAspect;   // canvas w / h
uniform float uProg;     // 0..1 scroll progress
uniform vec2 uSpot;      // light spot in image uv: the clean area grows from here

void main(){
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  uv.y = 1.0 - uv.y;
  vec3 before = texture2D(tBefore, uv).rgb;
  vec3 after = texture2D(tAfter, uv).rgb;

  vec2 spot = (vec2(uSpot.x, 1.0 - uSpot.y) - 0.5) / uCover + 0.5;
  float d = length((vUv - spot) * vec2(uAspect, 1.0));
  // a soft-edged circle of corrected paint grows from the light until it fills the frame
  float rad = pow(clamp(uProg / 0.9, 0.0, 1.0), 1.4) * (max(uAspect, 1.0) * 1.3);
  float clean = smoothstep(rad + 0.06, rad - 0.06, d);
  vec3 col = mix(before, after, clean);
  // a faint cool sheen travels along the edge of the circle
  col += vec3(0.55, 0.65, 0.9) * exp(-abs(d - rad) * 60.0) * 0.12 * step(0.01, uProg) * (1.0 - step(0.9, uProg));
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
  const uCover = U('uCover'), uAspect = U('uAspect'), uProg = U('uProg');
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
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  let raf = 0, visible = false;
  const frame = () => {
    raf = 0;
    if (!visible) return;
    gl.uniform1f(uProg, getProgress());
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(canvas);
  return true;
}
