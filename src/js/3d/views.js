/*! © 2026 Goodwin Anto. All rights reserved. */
/**
 * What each 3D view looks like and how it moves. A view is any element with data-gl="<shape>";
 * the renderer draws the shape inside that element's box every frame it is on screen.
 */
import { EVENTS } from '../config.js';
import { $, $$ } from '../dom.js';
import { clamp, lerp } from '../loop.js';
import { helixPoint, ORBIT_SKILLS, orbitNode, PATH_STOPS, pathPoint, STACK_LAYERS } from './geometry.js';
import { multiply, perspective, rotateX, rotateY, translateZ } from './math.js';

const FOV_Y = 0.7;
const NEAR = 0.1;
const FAR = 20;
/** Where the cursor counts as "outside" a view (clip space), so nothing near it lights up. */
const FAR_AWAY = 9;
const MOUSE_LERP = 0.06;
const ENERGY_DECAY = 0.96;
const TYPING_KICK = 0.25;
const SENT_KICK = 1.5;
const EGG_KICK = 2;
const STACK_CYCLE_S = 3.5;
const STACK_FOCUS_RADIUS = 0.75;
const STACK_SCAN = 0.5;
const PATH_FOCUS_RADIUS = 0.5;
const SKILL_FOCUS_RADIUS = 0.3;
const SKILL_CYCLE_S = 1.6;
const HELIX_FOCUS_RADIUS = 0.55;
const FAQ_KICK = 1.2;
/** Seconds a view takes to assemble from scattered points the first time it is drawn. */
const ASSEMBLE_S = 1.8;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/** @typedef {{ shape: string, distance: number, spin: number, tilt: number, size: number, alpha: number, speed: number, mouseTilt: number, scrollSpin?: number, scrollTilt?: number, scrollDolly?: number }} Preset */

const BASE = { distance: 3.4, spin: 0.12, tilt: 0.25, size: 1, alpha: 1, speed: 0.25, mouseTilt: 0.35 };
const PROJECT = { ...BASE, distance: 4.4, spin: 0.1, tilt: 0.15, scrollSpin: 0.9, size: 0.85 };

/** @type {Record<string, Preset | { field: true, alpha: number }>} */
export const PRESETS = {
    field: { field: true, alpha: 0.22 },
    graph: { ...BASE, shape: 'graph', distance: 3.3, scrollDolly: 1.4, scrollSpin: 1.6, scrollTilt: 0.5 },
    stack: { ...BASE, shape: 'stack', distance: 4.6, tilt: 0.6, spin: 0.15, size: 0.8 },
    docs: { ...PROJECT, shape: 'docs' },
    migrate: { ...PROJECT, shape: 'migrate', distance: 4.6 },
    chat: { ...PROJECT, shape: 'chat' },
    form: { ...PROJECT, shape: 'form' },
    scaffold: { ...PROJECT, shape: 'scaffold', alpha: 0.6 },
    path: { ...BASE, shape: 'path', distance: 2.2, spin: 0, tilt: 0.2, mouseTilt: 0.25, size: 0.9 },
    ring: { ...BASE, shape: 'ring', distance: 3.6, tilt: 1.05, spin: 0.1, speed: 0.4 },
    orbit: { ...BASE, shape: 'orbit', distance: 3.5, tilt: 0.35, spin: 0.2 },
    helix: { ...BASE, shape: 'helix', distance: 3.6, tilt: 0.12, spin: 0.35, speed: 0.35 },
    lattice: { ...BASE, shape: 'lattice', distance: 4.6, tilt: 0.55, spin: 0.12, size: 0.9 },
};

/**
 * Listens for the page events that drive the scene (active service, hovered skill, opened FAQ,
 * typing and sending in the contact form, the easter egg).
 * @returns {{ inputs: object, dispose: () => void }}
 */
export function createInputs() {
    // kicks: per-shape energy bursts (contact ring, FAQ lattice) that decay each frame
    const inputs = { layer: -1, skill: -1, energy: 0, kicks: { ring: 0, lattice: 0 }, pointer: { x: -1e4, y: -1e4 } };
    const off = [];
    const on = (target, type, fn, opts) => {
        target?.addEventListener(type, fn, opts);
        off.push(() => target?.removeEventListener(type, fn, opts));
    };
    on(window, 'pointermove', (e) => Object.assign(inputs.pointer, { x: e.clientX, y: e.clientY }), { passive: true });
    on(document.documentElement, 'pointerleave', () => Object.assign(inputs.pointer, { x: -1e4, y: -1e4 }));
    for (const card of $$('.service-card[data-layer]')) {
        const set = () => (inputs.layer = Number(card.dataset.layer));
        const unset = () => (inputs.layer = -1);
        on(card, 'pointerenter', set);
        on(card, 'focusin', set);
        on(card, 'pointerleave', unset);
        on(card, 'focusout', unset);
    }
    $$('.skill-tag').forEach((tag, i) => {
        on(tag, 'pointerenter', () => (inputs.skill = i % ORBIT_SKILLS));
        on(tag, 'pointerleave', () => (inputs.skill = -1));
    });
    for (const d of $$('.faq details')) on(d, 'toggle', () => d.open && (inputs.kicks.lattice = FAQ_KICK));
    const form = $('#contact-form');
    on(form, 'input', () => (inputs.kicks.ring = Math.min(1, inputs.kicks.ring + TYPING_KICK)));
    on(form, EVENTS.FORM_SENT, () => (inputs.kicks.ring = SENT_KICK));
    on(window, EVENTS.EGG, () => (inputs.energy = EGG_KICK));
    return { inputs, dispose: () => off.forEach((fn) => fn()) };
}

/**
 * Per-frame parameters for one view.
 * @param {{ preset: Preset, el: HTMLElement, mouse: number[] }} view
 * @param {DOMRect} rect the element's box this frame
 * @param {number} time seconds
 * @param {object} inputs from createInputs
 * @returns {{ mvp: Float32Array, mouse: number[], focus: number[], energy: number, depth: number, scroll: number, assemble: number }}
 */
export function frameParams(view, rect, time, inputs) {
    const p = view.preset;
    const px = ((inputs.pointer.x - rect.left) / rect.width) * 2 - 1;
    const py = -(((inputs.pointer.y - rect.top) / rect.height) * 2 - 1);
    const inside = Math.abs(px) <= 1 && Math.abs(py) <= 1;
    const mouse = inside ? [px, py] : [FAR_AWAY, FAR_AWAY];
    // the view leans toward the cursor while it is inside, and eases back when it leaves
    view.lean[0] = lerp(view.lean[0], inside ? px : 0, MOUSE_LERP);
    view.lean[1] = lerp(view.lean[1], inside ? py : 0, MOUSE_LERP);

    // scroll: hero progress for the graph, otherwise the element's position in the viewport (-1..1)
    const scroll =
        p.shape === 'graph' || p.field
            ? clamp(window.scrollY / (rect.height || 1))
            : clamp(((rect.top + rect.height / 2) / innerHeight) * 2 - 1, -1, 1);
    const energy = inputs.energy + (inputs.kicks[p.shape] ?? 0);
    if (p.field) return { mvp: null, mouse, focus: [0, 0, 0, 0], energy, depth: 0, scroll, assemble: 1 };
    view.born ??= time;
    const assemble = easeOutCubic(clamp((time - view.born) / ASSEMBLE_S));

    const dolly = p.scrollDolly ? scroll * p.scrollDolly : 0;
    const depth = p.distance + dolly;
    const spinY = time * p.spin + scroll * (p.scrollSpin ?? 0) + view.lean[0] * p.mouseTilt * 1.7;
    const tiltX = p.tilt - view.lean[1] * p.mouseTilt + scroll * (p.scrollTilt ?? 0);
    const model = multiply(rotateX(tiltX), rotateY(spinY));
    const mvp = multiply(perspective(FOV_Y, rect.width / rect.height, NEAR, FAR), multiply(translateZ(-depth), model));

    let focus = [0, 0, 0, 0];
    if (p.shape === 'stack') {
        const layer = inputs.layer >= 0 ? inputs.layer : Math.floor(time / STACK_CYCLE_S) % STACK_LAYERS.length;
        focus = [
            Math.sin(time) * STACK_SCAN,
            STACK_LAYERS[layer],
            Math.cos(time * 0.8) * STACK_SCAN,
            STACK_FOCUS_RADIUS,
        ];
    } else if (p.shape === 'path') {
        const t = clamp((innerHeight * 0.75 - rect.top) / (innerHeight * 0.75)); // 0 entering .. 1 at the top quarter
        const snapped = Math.round(t * (PATH_STOPS - 1)) / (PATH_STOPS - 1);
        focus = [...pathPoint(lerp(t, snapped, 0.35)), PATH_FOCUS_RADIUS];
    } else if (p.shape === 'orbit') {
        const skill = inputs.skill >= 0 ? inputs.skill : Math.floor(time / SKILL_CYCLE_S) % ORBIT_SKILLS;
        focus = [...orbitNode(skill), SKILL_FOCUS_RADIUS];
    } else if (p.shape === 'helix') {
        // the highlight climbs the helix (earliest role at the bottom) as the section scrolls past
        focus = [...helixPoint(clamp(1 - (rect.top + rect.height / 2) / innerHeight)), HELIX_FOCUS_RADIUS];
    }
    return { mvp, mouse, focus, energy, depth, scroll, assemble };
}

/**
 * Decays transient energy once per frame.
 * @param {object} inputs from createInputs
 */
export function decayInputs(inputs) {
    inputs.energy *= ENERGY_DECAY;
    for (const k of Object.keys(inputs.kicks)) inputs.kicks[k] *= ENERGY_DECAY;
}
