/*! © 2026 Goodwin Anto. All rights reserved. */
/** Thin WebGL 1 helpers. Failures return null (no throws, no console noise) so callers can fall back. */
import { ATTRIBUTES } from './shaders.js';

/** Context options: refuse software rendering, where this scene would only slow the page down. */
const CONTEXT_OPTIONS = {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: true,
};

/** Software rasterisers that slip past failIfMajorPerformanceCaveat on some platforms. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software/i;

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {WebGLRenderingContext | null} a hardware-accelerated context, or null
 */
export function getContext(canvas) {
    let gl;
    try {
        gl = canvas.getContext('webgl', CONTEXT_OPTIONS);
    } catch {
        return null;
    }
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (gl && SOFTWARE_RENDERER.test(renderer)) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return null;
    }
    return gl;
}

/**
 * Compiles and links a program and looks up its uniforms.
 * @param {WebGLRenderingContext} gl
 * @param {string} vertex GLSL source
 * @param {string} fragment GLSL source
 * @param {string[]} uniforms names to look up
 * @returns {{ program: WebGLProgram, u: Record<string, WebGLUniformLocation | null> } | null}
 */
export function createProgram(gl, vertex, fragment, uniforms) {
    const program = gl.createProgram();
    const shaders = [
        [gl.VERTEX_SHADER, vertex],
        [gl.FRAGMENT_SHADER, fragment],
    ].map(([type, src]) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        gl.attachShader(program, sh);
        return sh;
    });
    ATTRIBUTES.forEach((name, i) => gl.bindAttribLocation(program, i, name));
    gl.linkProgram(program);
    shaders.forEach((sh) => gl.deleteShader(sh));
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }
    const u = Object.fromEntries(uniforms.map((name) => [name, gl.getUniformLocation(program, name)]));
    return { program, u };
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {Float32Array} data
 * @returns {WebGLBuffer}
 */
export function createBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
}

/**
 * Binds a buffer whose vertices are `layout` floats wide, mapping them onto attributes 0..n.
 * @param {WebGLRenderingContext} gl
 * @param {WebGLBuffer} buffer
 * @param {number[]} layout floats per attribute, in location order
 */
export function bindLayout(gl, buffer, layout) {
    const stride = layout.reduce((a, b) => a + b, 0) * Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let offset = 0;
    ATTRIBUTES.forEach((_, loc) => {
        if (loc < layout.length) {
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, layout[loc], gl.FLOAT, false, stride, offset * Float32Array.BYTES_PER_ELEMENT);
            offset += layout[loc];
        } else {
            gl.disableVertexAttribArray(loc);
        }
    });
}
