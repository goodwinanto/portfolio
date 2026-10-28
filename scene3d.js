/* Hero "AI brain": a glowing node network in raw WebGL (~6 KB, no library).
   Loaded lazily by script.js. Reacts to the pointer and to scroll; returns a dispose() function.
   Three.js was skipped on purpose: its smallest no-build bundle is ~179 KB gzipped, over the 150 KB budget. */

const VERT_POINT = `
attribute vec3 p; attribute float s;
uniform mat4 m; uniform vec2 mouse; uniform float t, px, d;
varying float v;
void main(){
  vec4 c = m * vec4(p, 1.0); gl_Position = c;
  float near = smoothstep(0.5, 0.0, distance(c.xy / c.w, mouse));
  float f = clamp((d + 1.3 - c.w) / 2.6, 0.0, 1.0);
  v = (0.3 + 0.7 * f) * (0.75 + 0.25 * sin(t * 1.5 + s * 40.0)) + near * 0.6;
  gl_PointSize = px * (4.0 + 6.0 * fract(s * 7.0) + near * 9.0) * (3.0 / c.w);
}`;
const FRAG_POINT = `
precision mediump float; varying float v;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, r); a *= a;
  float core = smoothstep(0.35, 0.0, r);
  vec3 col = mix(vec3(0.06, 0.72, 0.5), vec3(1.0), core);
  gl_FragColor = vec4(col * a * v, a * v);
}`;
const VERT_LINE = `
attribute vec3 p; attribute float e; attribute float ph;
uniform mat4 m; uniform vec2 mouse; uniform float d;
varying float v, vt, vp, vn;
void main(){
  vec4 c = m * vec4(p, 1.0); gl_Position = c;
  vn = smoothstep(0.5, 0.0, distance(c.xy / c.w, mouse));
  v = 0.25 + 0.75 * clamp((d + 1.3 - c.w) / 2.6, 0.0, 1.0);
  vt = e; vp = ph;
}`;
const FRAG_LINE = `
precision mediump float; uniform float t; varying float v, vt, vp, vn;
void main(){
  float pulse = smoothstep(0.18, 0.0, abs(fract(t * 0.25 + vp) - vt));
  float a = (0.2 + vn * 0.45) * v + pulse * 0.8 * v;
  vec3 col = mix(vec3(0.06, 0.72, 0.5), vec3(1.0), pulse);
  gl_FragColor = vec4(col * a, a);
}`;

// Tiny deterministic PRNG so the live scene and the static fallback image match
const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function buildGraph() {
    const r = rng(7), nodes = [], N = 150;
    for (let i = 0; i < N; i++) { // fibonacci shell with jitter
        const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963, k = 0.88 + r() * 0.24;
        nodes.push([Math.cos(th) * rad * k, y * k, Math.sin(th) * rad * k]);
    }
    for (let i = 0; i < 30; i++) { // inner cluster
        const u = r() * 2 - 1, th = r() * 6.2832, rad = Math.sqrt(1 - u * u), k = 0.15 + r() * 0.45;
        nodes.push([Math.cos(th) * rad * k, u * k, Math.sin(th) * rad * k]);
    }
    const seen = new Set(), edges = [];
    nodes.forEach((a, i) => {
        nodes.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2])
            .filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 3)
            .forEach(([j]) => { const key = i < j ? i + '_' + j : j + '_' + i; if (!seen.has(key)) { seen.add(key); edges.push([i, j]); } });
    });
    const pts = new Float32Array(nodes.length * 4);
    nodes.forEach((n, i) => pts.set([...n, r()], i * 4));
    const lines = new Float32Array(edges.length * 10); // 2 verts x (xyz, e, phase)
    edges.forEach(([i, j], k) => {
        const ph = r();
        lines.set([...nodes[i], 0, ph, ...nodes[j], 1, ph], k * 10);
    });
    return { pts, lines, nPts: nodes.length, nVerts: edges.length * 2 };
}

const mul = (a, b) => { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
const rotY = (a) => new Float32Array([Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1]);
const rotX = (a) => new Float32Array([1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1]);
const trans = (z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]);
const persp = (asp) => { const f = 1 / Math.tan(0.35); return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, -1.02, -1, 0, 0, -0.2, 0]); };

/** @returns {(() => void) | null} dispose function, or null if WebGL is unavailable */
export function start(canvas, hero, opts = {}) {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power', preserveDrawingBuffer: !!opts.still });
    if (!gl) return null;

    const prog = (vs, fs) => {
        const p = gl.createProgram();
        for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
            const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
            gl.attachShader(p, sh);
        }
        gl.linkProgram(p);
        return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    };
    const pPts = prog(VERT_POINT, FRAG_POINT), pLn = prog(VERT_LINE, FRAG_LINE);
    if (!pPts || !pLn) return null;

    const g = buildGraph();
    const bPts = gl.createBuffer(), bLn = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bPts); gl.bufferData(gl.ARRAY_BUFFER, g.pts, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bLn); gl.bufferData(gl.ARRAY_BUFFER, g.lines, gl.STATIC_DRAW);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    let w = 1, h = 1, dpr = 1, mouse = [9, 9], sm = [0, 0], heroH = 1, raf = 0, visible = true, t0 = performance.now();
    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const r = canvas.getBoundingClientRect();
        w = canvas.width = Math.max(1, Math.round(r.width * dpr)); h = canvas.height = Math.max(1, Math.round(r.height * dpr));
        heroH = hero.offsetHeight || 1;
        gl.viewport(0, 0, w, h);
    };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

    const onMove = (e) => {
        const r = canvas.getBoundingClientRect();
        mouse = [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)];
    };
    const onLeave = () => { mouse = [9, 9]; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    const bind = (p, buf, stride, attrs) => {
        gl.useProgram(p); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        attrs.forEach(([name, size, off]) => {
            const loc = gl.getAttribLocation(p, name);
            gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4);
        });
    };

    const draw = (time) => {
        const sp = Math.min(1, Math.max(0, window.scrollY / heroH));
        const tgt = mouse[0] > 5 ? [0, 0] : mouse;
        sm[0] += (tgt[0] - sm[0]) * 0.06; sm[1] += (tgt[1] - sm[1]) * 0.06;
        const d = 3.3 + sp * 1.4;
        const mvp = mul(persp(w / h), mul(trans(-d), mul(rotX(0.25 - sm[1] * 0.35 + sp * 0.5), rotY(time * 0.12 + sp * 1.6 + sm[0] * 0.6))));
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (const [p, buf, stride, attrs, n, mode] of [
            [pLn, bLn, 5, [['p', 3, 0], ['e', 1, 3], ['ph', 1, 4]], g.nVerts, gl.LINES],
            [pPts, bPts, 4, [['p', 3, 0], ['s', 1, 3]], g.nPts, gl.POINTS],
        ]) {
            bind(p, buf, stride, attrs);
            gl.uniformMatrix4fv(gl.getUniformLocation(p, 'm'), false, mvp);
            gl.uniform2fv(gl.getUniformLocation(p, 'mouse'), mouse[0] > 5 ? [9, 9] : mouse);
            gl.uniform1f(gl.getUniformLocation(p, 't'), time);
            gl.uniform1f(gl.getUniformLocation(p, 'd'), d);
            gl.uniform1f(gl.getUniformLocation(p, 'px'), dpr);
            gl.drawArrays(mode, 0, n);
        }
    };

    if (opts.still) { draw(opts.still); return () => {}; }

    const loop = () => { raf = 0; if (!visible || document.hidden) return; draw((performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); };
    const kick = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }); io.observe(hero);
    document.addEventListener('visibilitychange', kick);
    kick();

    return () => { // teardown: stop loop, listeners and free GPU memory
        cancelAnimationFrame(raf); visible = false;
        io.disconnect(); ro.disconnect();
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerleave', onLeave);
        document.removeEventListener('visibilitychange', kick);
        gl.deleteBuffer(bPts); gl.deleteBuffer(bLn); gl.deleteProgram(pPts); gl.deleteProgram(pLn);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
}
