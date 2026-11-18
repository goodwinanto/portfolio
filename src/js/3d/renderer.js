/*! © 2026 Goodwin Anto. All rights reserved. */
/**
 * "Latent Field" renderer: ONE fixed, transparent canvas and ONE WebGL context draw every 3D
 * view on the page. Each frame, each visible [data-gl] element gets a scissored viewport over
 * its own box, so the 3D sits exactly where the layout puts it. The draw runs as a task in the
 * site-wide loop. Context loss, compile failure and missing WebGL all fall back to the CSS
 * versions; nothing throws or logs.
 */
import { EVENTS, GL_THEMES } from '../config.js';
import { $$ } from '../dom.js';
import { currentTheme } from '../env.js';
import { addTask, ORDER } from '../loop.js';
import { bindLayout, createBuffer, createProgram, getContext } from './gl.js';
import { buildShape } from './geometry.js';
import { FIELD_FRAGMENT, FIELD_VERTEX, LINE_FRAGMENT, LINE_VERTEX, POINT_FRAGMENT, POINT_VERTEX } from './shaders.js';
import { createInputs, decayInputs, frameParams, PRESETS } from './views.js';

const LIVE_CLASS = 'has-3d';
const MAX_DPR = 1.5;
const VISIBLE_MARGIN = '15% 0px';
const POINT_LAYOUT = [3, 1];
const LINE_LAYOUT = [3, 1, 1];
const QUAD = new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]);
const UNIFORMS = [
    'uMVP', 'uMouse', 'uFocus', 'uTime', 'uPx', 'uDepth', 'uSize', 'uEnergy', 'uInk', 'uCore',
    'uAlpha', 'uSpeed', 'uAspect', 'uScroll',
]; // prettier-ignore

const readTheme = () => GL_THEMES[currentTheme()];

/**
 * Creates programs and per-shape buffers. Called again after a context restore.
 * @param {WebGLRenderingContext} gl
 * @param {string[]} shapes
 */
function createResources(gl, shapes) {
    const programs = {
        points: createProgram(gl, POINT_VERTEX, POINT_FRAGMENT, UNIFORMS),
        lines: createProgram(gl, LINE_VERTEX, LINE_FRAGMENT, UNIFORMS),
        field: createProgram(gl, FIELD_VERTEX, FIELD_FRAGMENT, UNIFORMS),
    };
    if (Object.values(programs).some((p) => !p)) return null;
    const meshes = {};
    for (const shape of shapes) {
        const g = buildShape(shape);
        if (!g) continue;
        meshes[shape] = {
            points: createBuffer(gl, g.points),
            lines: createBuffer(gl, g.lines),
            nPoints: g.points.length / POINT_LAYOUT.reduce((a, b) => a + b),
            nLines: g.lines.length / LINE_LAYOUT.reduce((a, b) => a + b),
        };
    }
    return { programs, meshes, quad: createBuffer(gl, QUAD) };
}

/** Frees GPU memory held by a resource set. */
function freeResources(gl, res) {
    if (!res) return;
    Object.values(res.programs).forEach((p) => gl.deleteProgram(p.program));
    for (const m of Object.values(res.meshes)) {
        gl.deleteBuffer(m.points);
        gl.deleteBuffer(m.lines);
    }
    gl.deleteBuffer(res.quad);
}

/**
 * Starts the shared 3D scene.
 * @returns {(() => void) | null} dispose function, or null when WebGL is unavailable (CSS fallbacks stay)
 */
export function start() {
    const views = $$('[data-gl]')
        .filter((el) => PRESETS[el.dataset.gl])
        .map((el) => ({
            el,
            clip: el.closest('[data-gl-clip]'), // e.g. the hero, so the graph never spills past it
            preset: PRESETS[el.dataset.gl],
            lean: [0, 0],
            visible: false,
        }));
    if (!views.length) return null;

    const canvas = document.createElement('canvas');
    canvas.className = 'gl-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = getContext(canvas);
    if (!gl) return null;

    const shapes = [...new Set(views.map((v) => v.preset.shape).filter(Boolean))];
    let res = createResources(gl, shapes);
    if (!res) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return null;
    }
    document.body.prepend(canvas);
    const root = document.documentElement;
    root.classList.add(LIVE_CLASS);

    let theme = readTheme();
    let lost = false;
    let dirty = true;
    let dpr = 1;
    const t0 = performance.now();
    const { inputs, dispose: disposeInputs } = createInputs();

    const onTheme = () => (theme = readTheme());
    window.addEventListener(EVENTS.THEME, onTheme);

    const io = new IntersectionObserver(
        (entries) => entries.forEach((e) => (views.find((v) => v.el === e.target).visible = e.isIntersecting)),
        { rootMargin: VISIBLE_MARGIN },
    );
    views.forEach((v) => io.observe(v.el));

    const onLost = (e) => {
        e.preventDefault(); // allows the browser to restore the context later
        lost = true;
        res = null;
        root.classList.remove(LIVE_CLASS);
    };
    const onRestored = () => {
        res = createResources(gl, shapes);
        lost = !res;
        dirty = true;
        root.classList.toggle(LIVE_CLASS, !!res);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const w = Math.round(innerWidth * dpr);
        const h = Math.round(innerHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    };

    const setCommon = (prog, f, time) => {
        gl.useProgram(prog.program);
        gl.uniform2fv(prog.u.uMouse, f.mouse);
        gl.uniform1f(prog.u.uTime, time);
        gl.uniform1f(prog.u.uEnergy, f.energy);
        gl.uniform3fv(prog.u.uInk, theme.ink);
        gl.uniform3fv(prog.u.uCore, theme.core);
    };

    const drawView = (view, rect, time) => {
        const f = frameParams(view, rect, time, inputs);
        const p = view.preset;
        if (p.field) {
            const prog = res.programs.field;
            setCommon(prog, f, time);
            gl.uniform1f(prog.u.uAspect, rect.width / rect.height);
            gl.uniform1f(prog.u.uScroll, f.scroll);
            gl.uniform1f(prog.u.uAlpha, p.alpha * theme.alpha);
            bindLayout(gl, res.quad, [3]);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, QUAD.length / 3);
            return;
        }
        const mesh = res.meshes[p.shape];
        for (const [kind, buffer, layout, count, mode] of [
            ['lines', mesh.lines, LINE_LAYOUT, mesh.nLines, gl.LINES],
            ['points', mesh.points, POINT_LAYOUT, mesh.nPoints, gl.POINTS],
        ]) {
            const prog = res.programs[kind];
            setCommon(prog, f, time);
            gl.uniformMatrix4fv(prog.u.uMVP, false, f.mvp);
            gl.uniform4fv(prog.u.uFocus, f.focus);
            gl.uniform1f(prog.u.uDepth, f.depth);
            gl.uniform1f(prog.u.uPx, dpr);
            gl.uniform1f(prog.u.uSize, p.size);
            gl.uniform1f(prog.u.uSpeed, p.speed);
            gl.uniform1f(prog.u.uAlpha, p.alpha * theme.alpha);
            bindLayout(gl, buffer, layout);
            gl.drawArrays(mode, 0, count);
        }
    };

    const frame = (now) => {
        if (lost || gl.isContextLost()) return;
        const active = views.filter((v) => v.visible);
        if (!active.length && !dirty) return;
        resize();
        const time = (now - t0) / 1000;
        // read every box before drawing so the frame never interleaves layout reads with GL work
        const boxes = active.map((v) => [v, v.el.getBoundingClientRect(), v.clip?.getBoundingClientRect()]);
        gl.disable(gl.SCISSOR_TEST);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        if (theme.additive) gl.blendFunc(gl.ONE, gl.ONE);
        else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.SCISSOR_TEST);
        for (const [view, r, clip] of boxes) {
            const top = Math.max(r.top, clip?.top ?? -Infinity, 0);
            const bottom = Math.min(r.bottom, clip?.bottom ?? Infinity, innerHeight);
            if (r.width < 1 || r.height < 1 || bottom <= top) continue;
            gl.viewport(
                Math.round(r.left * dpr),
                Math.round((innerHeight - r.bottom) * dpr),
                Math.round(r.width * dpr),
                Math.round(r.height * dpr),
            );
            gl.scissor(
                Math.round(r.left * dpr),
                Math.round((innerHeight - bottom) * dpr),
                Math.round(r.width * dpr),
                Math.round((bottom - top) * dpr),
            );
            drawView(view, r, time);
        }
        decayInputs(inputs);
        dirty = active.length > 0;
    };
    const removeTask = addTask(frame, ORDER.RENDER);

    return () => {
        removeTask();
        io.disconnect();
        disposeInputs();
        window.removeEventListener(EVENTS.THEME, onTheme);
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
        freeResources(gl, res);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        canvas.remove();
        root.classList.remove(LIVE_CLASS);
    };
}
