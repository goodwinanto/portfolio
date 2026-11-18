/*! © 2026 Goodwin Anto. All rights reserved. */
import { CONTACT_EMAIL, EVENTS, WEB3FORMS_ENDPOINT } from './config.js';
import { $, $$ } from './dom.js';

const MESSAGES = {
    name: 'Please enter your name.',
    email: 'Please enter a valid email address.',
    message: 'Please tell me a little about the project.',
};

/**
 * Shows or clears the inline error for one field.
 * @param {HTMLInputElement | HTMLTextAreaElement} field
 * @returns {boolean} whether the field is valid
 */
function validateField(field) {
    const error = document.getElementById(field.getAttribute('aria-describedby'));
    const valid = field.checkValidity();
    field.setAttribute('aria-invalid', String(!valid));
    if (error) error.textContent = valid ? '' : MESSAGES[field.name];
    return valid;
}

/**
 * Contact form: inline validation with aria-invalid + described errors, focus on the first
 * problem, honeypot, and a JSON POST to Web3Forms with a plain email fallback on failure.
 */
export function initForm() {
    const form = $('#contact-form');
    const status = $('#form-status');
    if (!form || !status) return;
    const fields = $$('input[aria-describedby], textarea[aria-describedby]', form);
    const button = $('button[type="submit"]', form);

    const say = (msg, cls = '') => {
        status.textContent = msg;
        status.className = `form-status ${cls}`;
    };

    for (const f of fields) {
        // validate on leaving a field, then live once it has been flagged
        f.addEventListener('blur', () => f.value && validateField(f));
        f.addEventListener('input', () => f.getAttribute('aria-invalid') === 'true' && validateField(f));
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const invalid = fields.filter((f) => !validateField(f));
        if (invalid.length) {
            say('Please fix the highlighted fields.', 'err');
            invalid[0].focus();
            return;
        }
        if (form.botcheck.checked) return; // honeypot: silently drop bots
        button.disabled = true;
        say('Sending…');
        try {
            const res = await fetch(WEB3FORMS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form))),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
            form.reset();
            fields.forEach((f) => f.removeAttribute('aria-invalid'));
            say('Thanks, your message is in. I will reply within 24 hours.', 'ok');
            form.dispatchEvent(new CustomEvent(EVENTS.FORM_SENT));
        } catch {
            say(`Could not send that. Please email ${CONTACT_EMAIL} instead.`, 'err');
        } finally {
            button.disabled = false;
        }
    });
}
