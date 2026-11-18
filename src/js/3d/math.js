/*! © 2026 Goodwin Anto. All rights reserved. */
/** Minimal column-major 4x4 matrix helpers (WebGL convention). */

/**
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {Float32Array} a × b
 */
export function multiply(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
            out[col * 4 + row] = sum;
        }
    }
    return out;
}

/**
 * @param {number} angle radians
 * @returns {Float32Array} rotation about the X axis
 */
export function rotateX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

/**
 * @param {number} angle radians
 * @returns {Float32Array} rotation about the Y axis
 */
export function rotateY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

/**
 * @param {number} z distance along Z
 * @returns {Float32Array} translation matrix
 */
export function translateZ(z) {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]);
}

/**
 * @param {number} fovY vertical field of view in radians
 * @param {number} aspect width / height
 * @param {number} near
 * @param {number} far
 * @returns {Float32Array} perspective projection
 */
export function perspective(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    // prettier-ignore
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
