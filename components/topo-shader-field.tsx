'use client';

import { useEffect, useRef } from 'react';

/**
 * 全站共享的等高线状态：zoom 控制缩放，boost 控制亮度。
 * 首页 HeroScroll 随滚动写入（0.42→1.0），其他页面保持默认值。
 */
export const topoState = { zoom: 1, boost: 0.26 };

/**
 * WebGL2 等高线场：fbm 高度场 → 等值线（fwidth 抗锯齿），计曲线加粗。
 * - 作为全站固定背景层渲染（layout 挂载，-z-10）。
 * - 首页滚动驱动 zoom/boost（通过 topoState，带惯性平滑，完全可逆）。
 * - 鼠标扰动：光标处高度场隆起，等高线随之"晃动"，移开后指数恢复。
 * - prefers-reduced-motion：冻结时间与扰动，直接吸附目标值。
 */

const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uZoom;
uniform float uBoost;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform vec3 uInk;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(7.3, 3.1);
    a *= 0.5;
  }
  return v / 0.9375;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / max(uRes.y, 1.0);

  vec2 c = (uv - 0.5) / max(uZoom, 0.001) + 0.5;
  vec2 q = vec2(c.x * asp, c.y) * 3.1;
  q += 0.05 * vec2(sin(uTime * 0.11), cos(uTime * 0.085));

  float h = fbm(q);

  vec2 mp = (uMouse - 0.5) / max(uZoom, 0.001) + 0.5;
  vec2 mq = vec2(mp.x * asp, mp.y) * 3.1;
  vec2 d = q - mq;
  float r = 0.9;
  h += exp(-dot(d, d) / (r * r)) * 0.22 * uMouseOn;

  float f = h * 16.0;
  float fr = fract(f);
  float ld = min(fr, 1.0 - fr) * 2.0;
  float w = fwidth(f) * 1.0 + 0.0006;
  float isIdx = step(mod(floor(f), 4.0), 0.5);
  float th = mix(0.085, 0.21, isIdx);
  float line = 1.0 - smoothstep(th - w, th + w, ld);
  float halo = (1.0 - smoothstep(th, th * 2.8 + w, ld)) * 0.14;
  float a = clamp(line + halo, 0.0, 1.0);
  a *= mix(0.42, 1.0, isIdx);
  a *= mix(0.26, 1.0, uBoost);

  vec2 e = (uv - vec2(0.5, 0.34)) * vec2(asp * 0.8, 1.0);
  a *= smoothstep(1.5, 0.45, length(e));

  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  a *= 1.0 + (g - 0.5) * 0.06;

  fragColor = vec4(uInk * a, a);
}`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function TopoShaderField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = U('uRes');
    const uTime = U('uTime');
    const uZoom = U('uZoom');
    const uBoost = U('uBoost');
    const uMouse = U('uMouse');
    const uMouseOn = U('uMouseOn');
    const uInk = U('uInk');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let ink: number[] = [0.925, 0.898, 0.82];
    const readInk = () => {
      const s = getComputedStyle(document.documentElement);
      const hex = (s.getPropertyValue('--ink').trim() || '#ece5d1').replace('#', '');
      if (hex.length === 6) ink = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    };
    readInk();

    /* 惯性平滑的缩放/亮度：跟随 topoState 目标值 */
    let smZoom = topoState.zoom;
    let smBoost = topoState.boost;

    const draw = (now: number, t0: number) => {
      if (reduced) {
        smZoom = topoState.zoom;
        smBoost = topoState.boost;
      } else {
        smZoom += (topoState.zoom - smZoom) * 0.09;
        smBoost += (topoState.boost - smBoost) * 0.09;
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 0 : (now - t0) * 0.001);
      gl.uniform1f(uZoom, smZoom);
      gl.uniform1f(uBoost, smBoost);
      gl.uniform2f(uMouse, cur[0], cur[1]);
      gl.uniform1f(uMouseOn, reduced ? 0 : act);
      gl.uniform3f(uInk, ink[0], ink[1], ink[2]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const t0 = performance.now();
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw(performance.now(), t0);
    };

    /* 鼠标扰动：目标位与激活度各自平滑，移开自然衰减 */
    let tgt = [0.5, 0.5];
    let cur = [0.5, 0.5];
    let tgtOn = 0;
    let act = 0;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) {
        tgt = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
        tgtOn = 1;
      } else {
        tgtOn = 0;
      }
    };
    const onLeave = () => {
      tgtOn = 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    let raf = 0;
    let running = true;
    const loop = (now: number) => {
      if (!running) return;
      cur[0] += 0.1 * (tgt[0] - cur[0]);
      cur[1] += 0.1 * (tgt[1] - cur[1]);
      act += 0.06 * (tgtOn - act);
      if (act < 0.001) act = 0;
      draw(now, t0);
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (!reduced) {
      raf = requestAnimationFrame(loop);
    } else {
      const onScroll = () => requestAnimationFrame(() => draw(performance.now(), t0));
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    const onVis = () => {
      running = !document.hidden;
      if (running && !reduced) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    const mo = new MutationObserver(() => {
      readInk();
      draw(performance.now(), t0);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointermove', onMove);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
