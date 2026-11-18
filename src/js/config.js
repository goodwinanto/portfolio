/*! © 2026 Goodwin Anto. All rights reserved. */
/** Named constants shared across modules. Times are in ms, distances in CSS px unless noted. */

export const COPYRIGHT = '© 2026 Goodwin Anto. All rights reserved.';
/** Unique build signature; also seeds the 3D layout, so a copied scene carries it. */
export const SIGNATURE = 'GA-LATENT-FIELD-2026-7c1e9d4b';

export const CONTACT_EMAIL = 'goodwinantoofficial@gmail.com';
export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

/** Below this width the site is the light (no WebGL) phone version. */
export const BREAKPOINT_DESKTOP = 768;
/** The mobile menu closes when the viewport grows past this. */
export const BREAKPOINT_MENU = 769;
/** 3D only on devices with at least this many logical cores. */
export const MIN_CORES_3D = 4;
/** Connection types considered too slow for the 3D chunk. */
export const SLOW_CONNECTIONS = ['slow-2g', '2g', '3g'];
/** Fallback delay when requestIdleCallback is missing. */
export const IDLE_FALLBACK_MS = 800;
export const IDLE_TIMEOUT_MS = 2500;

export const NAV_SCROLLED_AT = 50;
/** Offset for anchor scrolling so headings clear the fixed navbar. */
export const ANCHOR_OFFSET = -70;

export const LENIS_DURATION = 1.2;
export const LENIS_TOUCH_MULTIPLIER = 2;

/** Easing factor per frame for the cursor ring (0..1). */
export const CURSOR_LERP = 0.15;
/** How far a magnetic button follows the pointer, as a share of the offset. */
export const MAGNET_STRENGTH = 0.28;
/** Max tilt of project frames on hover, in degrees. */
export const TILT_MAX_DEG = 5;
export const POINTER_LERP = 0.08;

/** Hero parallax: share of layer height moved over one hero height of scroll. */
export const HERO_PARALLAX = { ambient: 0.12, grid: 0.22, core: 0.38, orbs: 0.55, dust: 0.08 };
/** Hero pointer depth: px moved at the screen edge. */
export const HERO_POINTER_DEPTH = { ambient: 10, grid: 16, core: 34, orbs: 52 };

/** Delay between words in split headings. */
export const SPLIT_STAGGER_MS = 50;
export const REVEAL_ROOT_MARGIN = '0px 0px -8% 0px';

/** Sound: very quiet UI blips. */
export const SOUND_GAIN = 0.035;
export const SOUND_HOVER_HZ = 880;
export const SOUND_CLICK_HZ = 520;
export const SOUND_BLIP_S = 0.07;

/** Typing this anywhere (outside form fields) triggers the 3D easter egg. */
export const EASTER_EGG = 'goodwin';

/** Custom events shared between the page UI and the lazy 3D chunk. */
export const EVENTS = { THEME: 'themechange', FORM_SENT: 'formsent', EGG: 'easteregg' };

/** WebGL colours per theme (rgb 0..1). Dark glows additively; light draws ink with normal blending. */
export const GL_THEMES = {
    dark: { ink: [0.06, 0.72, 0.5], core: [1, 1, 1], alpha: 1, additive: true },
    light: { ink: [0.02, 0.47, 0.34], core: [0.02, 0.12, 0.09], alpha: 0.9, additive: false },
};
