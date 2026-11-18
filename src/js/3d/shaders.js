/*! © 2026 Goodwin Anto. All rights reserved. */
/**
 * Hand-written GLSL ES 1.00 shaders for the "Latent Field" scene. Every program carries the
 * copyright line and the build signature, so they travel with any copy of the shader source.
 * Attribute locations are bound before linking: 0 = position, 1 = seed / edge, 2 = phase.
 */
import { SIGNATURE } from '../config.js';

const HEADER = `// (c) 2026 Goodwin Anto. All rights reserved. ${SIGNATURE}\n`;

/* Assemble-in: before uAssemble reaches 1, each vertex is pushed out along a direction derived from its seed. */
const SCATTER = `
uniform mediump float uAssemble; // 0 = scattered, 1 = formed (mediump: shared with the fragment stage)
vec3 assemble(vec3 p, float seed) {
  vec3 dir = fract(vec3(seed * 13.7, seed * 71.3, seed * 39.1)) - 0.5;
  float k = 1.0 - uAssemble;
  return p + dir * 4.0 * k * k;
}`;

/** Shared attribute names per location. */
export const ATTRIBUTES = ['aPos', 'aAux', 'aPhase'];

/* Points: soft round sprites that brighten near the cursor and near a world-space focus. */
export const POINT_VERTEX = `${HEADER}
attribute vec3 aPos;
attribute float aAux; // per-point random seed
uniform mat4 uMVP;
uniform vec2 uMouse;  // cursor in clip space; far away when outside the view
uniform vec4 uFocus;  // xyz focus point, w radius (0 = off)
uniform float uTime, uPx, uDepth, uSize, uEnergy;
varying float vLight;
${SCATTER}
void main() {
  vec4 clip = uMVP * vec4(assemble(aPos, aAux), 1.0);
  gl_Position = clip;
  float near = smoothstep(0.5, 0.0, distance(clip.xy / clip.w, uMouse));
  float fog = clamp((uDepth + 1.3 - clip.w) / 2.6, 0.0, 1.0);
  float focus = uFocus.w > 0.0 ? smoothstep(uFocus.w, 0.0, distance(aPos, uFocus.xyz)) : 0.0;
  float twinkle = 0.75 + 0.25 * sin(uTime * 1.5 + aAux * 40.0);
  float lift = max(near, focus);
  vLight = (0.3 + 0.7 * fog) * twinkle + near * 0.6 + focus * 0.8 + uEnergy * 0.6;
  gl_PointSize = uPx * uSize * (4.0 + 6.0 * fract(aAux * 7.0) + lift * 8.0) * (3.0 / clip.w);
}`;

export const POINT_FRAGMENT = `${HEADER}
precision mediump float;
uniform vec3 uInk, uCore;
uniform float uAlpha, uAssemble;
varying float vLight;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float halo = smoothstep(1.0, 0.0, r);
  halo *= halo;
  vec3 col = mix(uInk, uCore, smoothstep(0.35, 0.0, r));
  float a = halo * vLight * uAlpha * (0.3 + 0.7 * uAssemble);
  gl_FragColor = vec4(col * a, a); // premultiplied
}`;

/* Lines: faint edges with signal pulses travelling along them (aAux = 0..1 along the edge). */
export const LINE_VERTEX = `${HEADER}
attribute vec3 aPos;
attribute float aAux;
attribute float aPhase;
uniform mat4 uMVP;
uniform vec2 uMouse;
uniform vec4 uFocus;
uniform float uDepth;
varying float vFog, vEdge, vPhase, vLift;
${SCATTER}
void main() {
  vec4 clip = uMVP * vec4(assemble(aPos, aPhase), 1.0); // both ends share a phase, so edges move rigidly
  gl_Position = clip;
  float near = smoothstep(0.5, 0.0, distance(clip.xy / clip.w, uMouse));
  float focus = uFocus.w > 0.0 ? smoothstep(uFocus.w, 0.0, distance(aPos, uFocus.xyz)) : 0.0;
  vLift = max(near, focus);
  vFog = 0.25 + 0.75 * clamp((uDepth + 1.3 - clip.w) / 2.6, 0.0, 1.0);
  vEdge = aAux;
  vPhase = aPhase;
}`;

export const LINE_FRAGMENT = `${HEADER}
precision mediump float;
uniform vec3 uInk, uCore;
uniform float uTime, uSpeed, uAlpha, uEnergy, uAssemble;
varying float vFog, vEdge, vPhase, vLift;
void main() {
  float pulse = smoothstep(0.18, 0.0, abs(fract(uTime * uSpeed + vPhase) - vEdge));
  float a = ((0.2 + vLift * 0.45) + pulse * 0.8) * vFog * (1.0 + uEnergy) * uAlpha * uAssemble * uAssemble;
  gl_FragColor = vec4(mix(uInk, uCore, pulse) * a, a);
}`;

/* Field: contour lines of a drifting noise "loss landscape"; the cursor carves a basin. */
export const FIELD_VERTEX = `${HEADER}
attribute vec3 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos.xy * 0.5 + 0.5;
  gl_Position = vec4(aPos.xy, 0.0, 1.0);
}`;

export const FIELD_FRAGMENT = `${HEADER}
precision mediump float;
uniform vec2 uMouse;
uniform float uAspect, uTime, uScroll, uAlpha, uEnergy;
uniform vec3 uInk;
varying vec2 vUv;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return v;
}
void main() {
  vec2 scale = vec2(uAspect, 1.0) * 1.6;
  vec2 p = (vUv - 0.5) * scale;
  vec2 m = uMouse * 0.5 * scale;
  float drift = uTime * 0.02;
  float h = fbm(p + vec2(drift, uScroll * 0.8 - drift * 0.6));
  float well = exp(-dot(p - m, p - m) * 3.0);
  h -= 0.28 * well;
  float bands = h * 16.0;
  float d = min(fract(bands), 1.0 - fract(bands));
  float major = step(0.5, fract(bands / 5.0 + 0.1)) * 0.5 + 0.5;
  float line = (1.0 - smoothstep(0.0, 0.07, d)) * major;
  float fade = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y) * (0.35 + 0.65 * smoothstep(0.1, 0.75, vUv.x));
  float a = line * fade * uAlpha * (1.0 + well * 1.5 + uEnergy);
  gl_FragColor = vec4(uInk * a, a);
}`;
