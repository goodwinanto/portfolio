/*! © 2026 Goodwin Anto. All rights reserved. */
import { BREAKPOINT_DESKTOP, MIN_CORES_3D, SLOW_CONNECTIONS } from './config.js';

/** Live media queries shared by every module. */
export const media = {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
    finePointer: window.matchMedia('(hover: hover) and (pointer: fine)'),
    desktop: window.matchMedia(`(min-width: ${BREAKPOINT_DESKTOP}px)`),
    light: window.matchMedia('(prefers-color-scheme: light)'),
};

/** @returns {boolean} true when the user has not asked for reduced motion */
export const motionAllowed = () => !media.reducedMotion.matches;

/** @returns {boolean} true on a desktop-sized screen with a mouse and motion allowed */
export const richPointer = () => motionAllowed() && media.finePointer.matches && media.desktop.matches;

/** @returns {boolean} true when the device and network can afford the WebGL scene */
export function can3D() {
    const net = navigator.connection;
    return (
        motionAllowed() &&
        media.desktop.matches &&
        (navigator.hardwareConcurrency || 0) >= MIN_CORES_3D &&
        !net?.saveData &&
        !SLOW_CONNECTIONS.includes(net?.effectiveType)
    );
}

/** @returns {'light' | 'dark'} the theme in effect: an explicit choice, else the system preference */
export const currentTheme = () => document.documentElement.dataset.theme || (media.light.matches ? 'light' : 'dark');
