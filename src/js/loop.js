/*! © 2026 Goodwin Anto. All rights reserved. */
/**
 * The one requestAnimationFrame loop for the whole site (smooth scroll, parallax, cursor, WebGL).
 * Tasks run in ascending `order`; the loop sleeps while the tab is hidden or no task is registered.
 */

/** Task order: read scroll first, then draw (reads layout), then write styles. */
export const ORDER = { SCROLL: 0, RENDER: 10, STYLE: 20 };

/** @type {{ fn: (time: number) => void, order: number }[]} */
let tasks = [];
let raf = 0;

const frame = (time) => {
    raf = 0;
    for (const t of tasks) t.fn(time);
    schedule();
};

function schedule() {
    if (!raf && tasks.length && !document.hidden) raf = requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', schedule);

/**
 * Registers a per-frame task.
 * @param {(time: number) => void} fn called with the rAF timestamp in ms
 * @param {number} [order] lower runs first, see ORDER
 * @returns {() => void} removes the task
 */
export function addTask(fn, order = ORDER.STYLE) {
    const task = { fn, order };
    tasks = [...tasks, task].sort((a, b) => a.order - b.order);
    schedule();
    return () => {
        tasks = tasks.filter((t) => t !== task);
    };
}

/**
 * Moves `current` a fraction of the way to `target`.
 * @param {number} current
 * @param {number} target
 * @param {number} factor 0..1 per frame
 * @returns {number}
 */
export const lerp = (current, target, factor) => current + (target - current) * factor;

/**
 * @param {number} v
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number} v limited to [min, max]
 */
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
