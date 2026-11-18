/*! © 2026 Goodwin Anto. All rights reserved. */

/**
 * @param {string} sel CSS selector
 * @param {ParentNode} [root]
 * @returns {HTMLElement | null}
 */
export const $ = (sel, root = document) => root.querySelector(sel);

/**
 * @param {string} sel CSS selector
 * @param {ParentNode} [root]
 * @returns {HTMLElement[]}
 */
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
