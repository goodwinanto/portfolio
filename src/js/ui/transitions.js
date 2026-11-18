/*! © 2026 Goodwin Anto. All rights reserved. */
import { motionAllowed } from '../env.js';

/**
 * Runs a DOM update inside a View Transition when supported and motion is allowed,
 * otherwise applies it straight away.
 * @param {() => void} update synchronous DOM change
 * @returns {Promise<void>} resolves when the transition (if any) has finished
 */
export function withTransition(update) {
    if (!document.startViewTransition || !motionAllowed()) {
        update();
        return Promise.resolve();
    }
    return document.startViewTransition(update).finished.catch(() => {});
}
