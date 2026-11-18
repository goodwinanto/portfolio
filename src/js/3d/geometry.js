/*! © 2026 Goodwin Anto. All rights reserved. */
/**
 * Procedural geometry for every 3D view. Each builder returns point sprites (x, y, z, seed)
 * and line segments (x, y, z, edge 0..1, phase). Randomness comes from a PRNG seeded with the
 * build signature, so the exact layout is reproducible and provably this site's.
 */
import { SIGNATURE } from '../config.js';

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = 2.399963;
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * FNV-1a hash.
 * @param {string} text
 * @returns {number} 32-bit unsigned hash
 */
export function hashString(text) {
    let h = FNV_OFFSET;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), FNV_PRIME);
    return h >>> 0;
}

/**
 * Mulberry32 PRNG.
 * @param {number} seed
 * @returns {() => number} uniform random numbers in [0, 1)
 */
export function createRng(seed) {
    let a = seed | 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Accumulates points and line segments, then packs them into typed arrays. */
class Builder {
    /** @param {() => number} rng */
    constructor(rng) {
        this.rng = rng;
        this.pts = [];
        this.lns = [];
    }

    /** @param {number[]} p xyz */
    point(p) {
        this.pts.push(p[0], p[1], p[2], this.rng());
        return this;
    }

    /** Polyline with one continuous edge parameter, so pulses run along the whole path. */
    path(points, closed = false) {
        const list = closed ? [...points, points[0]] : points;
        const n = list.length - 1;
        const phase = this.rng();
        for (let i = 0; i < n; i++) this.lns.push(...list[i], i / n, phase, ...list[i + 1], (i + 1) / n, phase);
        return this;
    }

    /** @returns {{ points: Float32Array, lines: Float32Array }} */
    build() {
        return { points: new Float32Array(this.pts), lines: new Float32Array(this.lns) };
    }
}

const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const range = (n) => Array.from({ length: n }, (_, i) => i);
const circle = (radius, steps, y = 0) =>
    range(steps).map((i) => [Math.cos((i / steps) * TAU) * radius, y, Math.sin((i / steps) * TAU) * radius]);
const rect = (x0, y0, x1, y1, z) => [
    [x0, y0, z],
    [x1, y0, z],
    [x1, y1, z],
    [x0, y1, z],
];

/** Hero: neural graph, a jittered Fibonacci shell plus an inner cluster, each node linked to its nearest neighbours. */
function graph(b) {
    const SHELL = 150;
    const CORE = 30;
    const NEIGHBOURS = 3;
    const nodes = [];
    for (let i = 0; i < SHELL; i++) {
        const y = 1 - (i / (SHELL - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const k = 0.88 + b.rng() * 0.24;
        nodes.push([Math.cos(i * GOLDEN_ANGLE) * r * k, y * k, Math.sin(i * GOLDEN_ANGLE) * r * k]);
    }
    for (let i = 0; i < CORE; i++) {
        const u = b.rng() * 2 - 1;
        const th = b.rng() * TAU;
        const r = Math.sqrt(1 - u * u);
        const k = 0.15 + b.rng() * 0.45;
        nodes.push([Math.cos(th) * r * k, u * k, Math.sin(th) * r * k]);
    }
    const dist = (a, c) => (a[0] - c[0]) ** 2 + (a[1] - c[1]) ** 2 + (a[2] - c[2]) ** 2;
    const seen = new Set();
    nodes.forEach((a, i) => {
        b.point(a);
        nodes
            .map((c, j) => [j, dist(a, c)])
            .filter(([j]) => j !== i)
            .sort((x, y) => x[1] - y[1])
            .slice(0, NEIGHBOURS)
            .forEach(([j]) => {
                const key = Math.min(i, j) * 1000 + Math.max(i, j);
                if (seen.has(key)) return;
                seen.add(key);
                b.path([a, nodes[j]]);
            });
    });
}

/** Services: three stacked layers (interface, logic, infrastructure) with data links between them. */
export const STACK_LAYERS = [0.75, 0, -0.75];
function stack(b) {
    const GRID = 8;
    const HALF = 0.9;
    const LINKS = 7;
    for (const y of STACK_LAYERS) {
        for (const i of range(GRID)) {
            for (const j of range(GRID)) {
                const jitter = () => (b.rng() - 0.5) * 0.06;
                b.point([
                    -HALF + (2 * HALF * i) / (GRID - 1) + jitter(),
                    y,
                    -HALF + (2 * HALF * j) / (GRID - 1) + jitter(),
                ]);
            }
        }
        b.path(
            rect(-HALF, -HALF, HALF, HALF, 0).map(([x, z]) => [x, y, z]),
            true,
        );
    }
    for (let l = 0; l < STACK_LAYERS.length - 1; l++) {
        for (let k = 0; k < LINKS; k++) {
            const x = (b.rng() * 2 - 1) * HALF;
            const z = (b.rng() * 2 - 1) * HALF;
            b.path([
                [x, STACK_LAYERS[l + 1], z],
                [x, STACK_LAYERS[l], z],
            ]);
        }
    }
}

/** Project 01, DocuMind RAG: a stack of text pages feeding one cited answer node. */
function docs(b) {
    const PAGES = 5;
    const ROWS = 9;
    const answer = [0, 0.15, 1.2];
    for (let p = 0; p < PAGES; p++) {
        const z = (p - PAGES / 2) * 0.28;
        const dx = (p - PAGES / 2) * 0.07;
        b.path(rect(-0.7 + dx, -0.95, 0.7 + dx, 0.95, z), true);
        for (let r = 0; r < ROWS; r++) {
            const y = 0.75 - r * 0.18;
            const len = 0.5 + b.rng() * 0.75;
            for (let x = -0.55; x < -0.55 + len; x += 0.09) b.point([x + dx, y, z]);
            if (p === PAGES - 1 && r % 3 === 1) b.path([[-0.55 + dx + len / 2, y, z], answer]);
        }
    }
    b.point(answer).point(answer);
}

/** Project 02, AirMigrate: two clusters with verified transfers arcing between them. */
function migrate(b) {
    const PER_CLUSTER = 70;
    const ARCS = 12;
    const ARC_STEPS = 14;
    const centres = [
        [-1, 0, 0],
        [1, 0, 0],
    ];
    const clusters = centres.map((c) =>
        range(PER_CLUSTER).map((i) => {
            const y = 1 - (i / (PER_CLUSTER - 1)) * 2;
            const r = Math.sqrt(1 - y * y) * 0.45;
            const p = [c[0] + Math.cos(i * GOLDEN_ANGLE) * r, c[1] + y * 0.45, c[2] + Math.sin(i * GOLDEN_ANGLE) * r];
            b.point(p);
            return p;
        }),
    );
    for (let k = 0; k < ARCS; k++) {
        const from = clusters[0][Math.floor(b.rng() * PER_CLUSTER)];
        const to = clusters[1][Math.floor(b.rng() * PER_CLUSTER)];
        const lift = 0.6 + b.rng() * 0.6;
        b.path(
            range(ARC_STEPS + 1).map((s) => {
                const t = s / ARC_STEPS;
                const p = lerp3(from, to, t);
                p[1] += Math.sin(t * Math.PI) * lift;
                return p;
            }),
        );
    }
}

/** Project 03, IT support chatbot: a question bubble and an answer bubble, offset in depth. */
function chat(b) {
    const STEPS = 48;
    const bubble = (cx, cy, w, h, z, tailSide) => {
        const pts = range(STEPS).map((i) => {
            const a = (i / STEPS) * TAU;
            const c = Math.cos(a);
            const s = Math.sin(a);
            // superellipse: a rounded rectangle
            return [cx + Math.sign(c) * Math.abs(c) ** 0.4 * w, cy + Math.sign(s) * Math.abs(s) ** 0.4 * h, z];
        });
        const tail = [cx + tailSide * w * 0.6, cy - h * 1.35, z];
        b.path(pts, true).path([
            [cx + tailSide * w * 0.3, cy - h, z],
            tail,
            [cx + tailSide * w * 0.75, cy - h * 0.92, z],
        ]);
        pts.forEach((p, i) => i % 2 === 0 && b.point(p));
    };
    bubble(-0.35, 0.4, 0.85, 0.42, -0.3, -1);
    bubble(0.45, -0.45, 0.7, 0.32, 0.3, 1);
    for (const x of [0.25, 0.45, 0.65]) b.point([x, -0.45, 0.3]).point([x, -0.45, 0.3]);
}

/** Project 04, job application automator: form fields filling in, a cursor node on the active one. */
function form(b) {
    const FIELDS = 4;
    for (let f = 0; f < FIELDS; f++) {
        const y = 0.75 - f * 0.5;
        b.path(rect(-1.1, y - 0.14, 1.1, y + 0.14, 0), true);
        const filled = f < FIELDS - 1 ? 0.5 + b.rng() * 0.5 : 0.3;
        for (let x = -0.95; x < -0.95 + filled * 1.9; x += 0.08) b.point([x, y, 0.02]);
        if (f === FIELDS - 1)
            b.point([-0.95 + filled * 1.9 + 0.08, y, 0.1]).point([-0.95 + filled * 1.9 + 0.08, y, 0.1]);
    }
}

/** Placeholders: a wireframe cube, still under construction. */
function scaffold(b) {
    const S = 0.75;
    const corners = range(8).map((i) => [i & 1 ? S : -S, i & 2 ? S : -S, i & 4 ? S : -S]);
    const edges = [
        [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
    ]; // prettier-ignore
    for (const [i, j] of edges) {
        b.path([corners[i], corners[j]]);
        for (let t = 0; t <= 1; t += 0.125) b.point(lerp3(corners[i], corners[j], t));
    }
}

/** Process: four stops on a gentle S-curve; the scroll drives a focus along it. */
export const PATH_STOPS = 4;
const PATH_SPAN = 3;
const PATH_WAVE = 0.35;
/**
 * @param {number} t 0..1 along the process path
 * @returns {number[]} xyz point on the path
 */
export const pathPoint = (t) => [(t * 2 - 1) * PATH_SPAN, Math.sin(t * TAU) * PATH_WAVE, Math.cos(t * Math.PI) * 0.3];
function path(b) {
    const STEPS = 80;
    const curve = range(STEPS + 1).map((i) => pathPoint(i / STEPS));
    b.path(curve);
    curve.forEach((p, i) => i % 3 === 0 && b.point(p));
    for (let s = 0; s < PATH_STOPS; s++) {
        const c = pathPoint(s / (PATH_STOPS - 1));
        const ring = circle(0.16, 14).map(([x, , z]) => [c[0] + x, c[1] + z, c[2]]);
        b.path(ring, true);
        ring.forEach((p) => b.point(p));
        b.point(c).point(c);
    }
}

/** Contact: a signal ring (torus) with concentric orbits. */
function ring(b) {
    const MAJOR = 1;
    const MINOR = 0.1;
    const POINTS = 220;
    for (let i = 0; i < POINTS; i++) {
        const u = b.rng() * TAU;
        const v = b.rng() * TAU;
        b.point([
            (MAJOR + MINOR * Math.cos(v)) * Math.cos(u),
            MINOR * Math.sin(v),
            (MAJOR + MINOR * Math.cos(v)) * Math.sin(u),
        ]);
    }
    for (const r of [0.55, 0.78, 1.25]) b.path(circle(r, 64), true);
}

const BUILDERS = { graph, stack, docs, migrate, chat, form, scaffold, path, ring };

/**
 * Builds the geometry for one shape. The seed mixes the signature with the shape name.
 * @param {keyof typeof BUILDERS} shape
 * @returns {{ points: Float32Array, lines: Float32Array } | null}
 */
export function buildShape(shape) {
    const builder = BUILDERS[shape];
    if (!builder) return null;
    const b = new Builder(createRng(hashString(`${SIGNATURE}:${shape}`)));
    builder(b);
    return b.build();
}
