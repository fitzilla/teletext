// The "television": composes a PAL-shaped video frame (teletext page and/or
// a TV picture) and runs it through a CRT shader: curved glass, scanlines,
// phosphor mask, bloom, colour fringing, flicker and the switch-on line.

import { WIDTH as PAGE_W, HEIGHT as PAGE_H } from './teletext.js';

// A 4:3 PAL frame. Teletext filled about 77% of the line and 500 of the 576
// visible lines, so the page ends up slightly stretched sideways.
export const FRAME_W = 768;
export const FRAME_H = 576;
const PAGE_X = Math.round(FRAME_W * 0.115);
const PAGE_DRAW_W = Math.round(FRAME_W * 0.77);
const PAGE_Y = Math.round((FRAME_H - PAGE_H) / 2);

const BARS = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf', '#101010'];

export class VideoFrame {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = FRAME_W;
    this.canvas.height = FRAME_H;
    this.ctx = this.canvas.getContext('2d');
    this.noise = document.createElement('canvas');
    this.noise.width = 192;
    this.noise.height = 144;
    this.noiseCtx = this.noise.getContext('2d');
    this.noiseData = this.noiseCtx.createImageData(192, 144);
  }

  // The programme "behind" the teletext: colour bars with a station ident.
  drawPicture(time) {
    const { ctx } = this;
    const bw = FRAME_W / BARS.length;
    BARS.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw), FRAME_H * 0.72); });
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, FRAME_H * 0.72, FRAME_W, FRAME_H * 0.28);
    // Station ident, kept clear of where subtitles go.
    ctx.fillRect(FRAME_W * 0.3, FRAME_H * 0.24, FRAME_W * 0.4, FRAME_H * 0.22);
    ctx.fillStyle = '#e8e8e8';
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px Helvetica, Arial, sans-serif';
    ctx.fillText('FITZ TV', FRAME_W / 2, FRAME_H * 0.35);
    ctx.font = '22px Helvetica, Arial, sans-serif';
    ctx.fillText(new Date(time).toLocaleTimeString('en-GB'), FRAME_W / 2, FRAME_H * 0.42);

    // A little off-air grain.
    const d = this.noiseData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 26;
    }
    this.noiseCtx.putImageData(this.noiseData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.noise, 0, 0, FRAME_W, FRAME_H);
  }

  // size: 0 normal, 1 top half doubled, 2 bottom half doubled (the SIZE key).
  compose(pageCanvas, { showPicture, showPage, size, time }) {
    const { ctx } = this;
    if (showPicture) this.drawPicture(time);
    else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FRAME_W, FRAME_H); }
    if (!showPage) return;
    // Horizontal smoothing stands in for the limited bandwidth of the signal.
    ctx.imageSmoothingEnabled = true;
    if (size === 0) {
      ctx.drawImage(pageCanvas, 0, 0, PAGE_W, PAGE_H, PAGE_X, PAGE_Y, PAGE_DRAW_W, PAGE_H);
    } else {
      const sy = size === 1 ? 0 : PAGE_H / 2;
      ctx.drawImage(pageCanvas, 0, sy, PAGE_W, PAGE_H / 2, PAGE_X, PAGE_Y, PAGE_DRAW_W, PAGE_H);
    }
  }
}

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_src;
uniform float u_time;
uniform float u_power;
uniform float u_motion;
varying vec2 v_uv;

vec2 curve(vec2 uv) {
  uv = uv * 2.0 - 1.0;
  uv *= 0.985;
  uv.x *= 1.0 + pow(abs(uv.y) / 6.0, 2.0);
  uv.y *= 1.0 + pow(abs(uv.x) / 5.0, 2.0);
  return uv * 0.5 + 0.5;
}

vec3 tap(vec2 uv) { return texture2D(u_tex, uv).rgb; }

void main() {
  vec2 uv = curve(v_uv);

  // Switch-on: the picture opens out from a bright line.
  float open = smoothstep(0.08, 0.7, u_power);
  float wide = smoothstep(0.0, 0.12, u_power);
  uv.y = 0.5 + (uv.y - 0.5) / max(open, 0.004);
  uv.x = 0.5 + (uv.x - 0.5) / max(wide, 0.004);

  vec2 edge = smoothstep(0.0, 0.006, uv) * smoothstep(0.0, 0.006, 1.0 - uv);
  float inside = edge.x * edge.y;

  vec2 px = 1.0 / u_src;
  vec3 col;
  col.r = tap(uv + vec2(px.x * 0.8, 0.0)).r;
  col.g = tap(uv).g;
  col.b = tap(uv - vec2(px.x * 0.8, 0.0)).b;
  col = col * 0.7 + 0.15 * (tap(uv + vec2(px.x, 0.0)) + tap(uv - vec2(px.x, 0.0)));

  // Bloom: bright phosphor bleeding into its neighbours.
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854;
    vec2 o = vec2(cos(a), sin(a)) * px * 2.5;
    glow += tap(uv + o) + 0.6 * tap(uv + o * 2.4);
  }
  col += glow / 12.8 * 0.38;

  // Scanlines: one PAL field is 288 lines. Bright lines spread wider.
  float lines = u_src.y * 0.5;
  float density = clamp((u_res.y / lines - 1.2) / 1.6, 0.0, 1.0);
  float f = fract(uv.y * lines) - 0.5;
  float lum = dot(col, vec3(0.3, 0.59, 0.11));
  float w = mix(0.22, 0.42, clamp(lum, 0.0, 1.0));
  float beam = exp(-(f * f) / (2.0 * w * w));
  col *= mix(1.0, 0.35 + 0.9 * beam, 0.8 * density);

  // Aperture grille.
  float m = mod(gl_FragCoord.x, 3.0);
  vec3 mask = m < 1.0 ? vec3(1.12, 0.86, 0.86) : m < 2.0 ? vec3(0.86, 1.12, 0.86) : vec3(0.86, 0.86, 1.12);
  col *= mix(vec3(1.0), mask, 0.55 * density);

  // Mains hum and flicker.
  col *= 1.0 - u_motion * (0.018 * (0.5 + 0.5 * sin(uv.y * 3.0 - u_time * 1.4)) + 0.008 * sin(u_time * 157.0));

  // Vignette and the slightly grey black of a switched-on tube.
  float vig = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
  col *= pow(clamp(16.0 * vig, 0.0, 1.0), 0.18);
  col += vec3(0.018, 0.022, 0.02) * u_power;

  // The switch-on line is over-bright.
  col *= 1.0 + 2.5 * (1.0 - open) * wide;
  col *= inside * step(0.001, u_power);

  // Reflection on the glass, drawn in screen space so it doesn't curve.
  float shine = smoothstep(0.55, 0.0, length((v_uv - vec2(0.22, 0.12)) * vec2(1.0, 1.6)));
  col += vec3(0.05, 0.055, 0.06) * shine;

  gl_FragColor = vec4(col, 1.0);
}`;

export class CRT {
  constructor(canvas) {
    this.canvas = canvas;
    this.enabled = true;
    this.power = 0;
    this.motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (gl && this.#init(gl)) this.gl = gl;
    else this.ctx2d = canvas.getContext('2d');
  }

  #init(gl) {
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.u = {};
    for (const name of ['u_res', 'u_src', 'u_time', 'u_power', 'u_motion']) this.u[name] = gl.getUniformLocation(prog, name);
    gl.uniform2f(this.u.u_src, FRAME_W, FRAME_H);
    return true;
  }

  get webgl() { return Boolean(this.gl); }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (w && h && (this.canvas.width !== w || this.canvas.height !== h)) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  draw(frameCanvas, time, frameChanged) {
    this.resize();
    const { width, height } = this.canvas;
    if (this.gl && this.enabled) {
      const { gl } = this;
      gl.viewport(0, 0, width, height);
      if (frameChanged) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, frameCanvas);
      gl.uniform2f(this.u.u_res, width, height);
      gl.uniform1f(this.u.u_time, time / 1000);
      gl.uniform1f(this.u.u_power, this.power);
      gl.uniform1f(this.u.u_motion, this.motion);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }
    // Flat fallback (no WebGL, or the CRT effect switched off).
    const ctx = this.ctx2d ?? this.#flat();
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    if (this.power > 0.5) ctx.drawImage(frameCanvas, 0, 0, width, height);
  }

  // Switching the effect off needs a 2D canvas in place of the WebGL one.
  #flat() {
    if (!this.flatCanvas) {
      this.flatCanvas = document.createElement('canvas');
      this.flatCanvas.className = this.canvas.className;
      this.flatCanvas.setAttribute('aria-hidden', 'true');
      this.flatCtx = this.flatCanvas.getContext('2d');
    }
    return this.flatCtx;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.gl) return;
    const flat = this.#flat();
    if (on) {
      this.flatCanvas.replaceWith(this.glCanvas);
      this.canvas = this.glCanvas;
    } else {
      this.glCanvas = this.canvas;
      this.canvas.replaceWith(this.flatCanvas);
      this.canvas = this.flatCanvas;
    }
    this.ctx2d = on ? undefined : flat;
  }
}
