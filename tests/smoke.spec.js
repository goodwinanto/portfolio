/*! © 2026 Goodwin Anto. All rights reserved. */
import { expect, test } from '@playwright/test';

/** Collects console errors, page errors and CSP violations for the current page. */
async function watch(page) {
    const problems = [];
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
    page.on('pageerror', (e) => problems.push(e.message));
    await page.addInitScript(() =>
        document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP: ${e.violatedDirective}`)),
    );
    return problems;
}

test('home loads with content, no console errors and no CSP violations', async ({ page }) => {
    const problems = await watch(page);
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText(/Goodwin\s+Anto/);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500); // let lazy chunks (smooth scroll, 3D) settle
    expect(problems).toEqual([]);
});

test('copyright notice is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toContainText('© 2026 Goodwin Anto. All rights reserved.');
});

test('contact form validates inline and never posts invalid data', async ({ page }) => {
    let posts = 0;
    await page.route('https://api.web3forms.com/**', (route) => {
        posts++;
        return route.fulfill({ json: { success: true } });
    });
    await page.goto('/#contact');
    const form = page.locator('#contact-form');
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('#f-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('#f-email-err')).toHaveText(/valid email/);
    await expect(form.locator('#f-name')).toBeFocused();
    await form.locator('#f-name').fill('Test Person');
    await form.locator('#f-email').fill('not-an-email');
    await form.locator('#f-message').fill('Hello');
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('#f-email')).toHaveAttribute('aria-invalid', 'true');
    expect(posts).toBe(0);

    await form.locator('#f-email').fill('test@example.com');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#form-status')).toHaveText(/message is in/);
    expect(posts).toBe(1);
});

test('project filter shows matching projects and announces the count', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByRole('group', { name: 'Filter projects' });
    await bar.getByRole('button', { name: 'Web & WordPress' }).click();
    await expect(bar.getByRole('button', { name: 'Web & WordPress' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.project-card:visible')).toHaveCount(2);
    await expect(page.locator('#filter-status')).toHaveText(/Showing 2 of 6/);
    await bar.getByRole('button', { name: 'All' }).click();
    await expect(page.locator('.project-card:visible')).toHaveCount(6);
});

test('theme toggle switches and remembers the choice', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Light theme' });
    const before = await toggle.getAttribute('aria-pressed');
    await toggle.click();
    await expect(toggle).not.toHaveAttribute('aria-pressed', before);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Light theme' })).not.toHaveAttribute('aria-pressed', before);
});

test.describe('3D fallback', () => {
    test('WebGL disabled: CSS depth stays, no errors', async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        // simulates no WebGL support at all
        await page.addInitScript(() => {
            HTMLCanvasElement.prototype.getContext = () => null;
        });
        const problems = await watch(page);
        await page.goto('/');
        await page.waitForTimeout(3500);
        await expect(page.locator('html')).not.toHaveClass(/has-3d/);
        await expect(page.locator('.gl-canvas')).toHaveCount(0);
        await expect(page.locator('.core-fallback')).toBeVisible();
        expect(problems).toEqual([]);
        await context.close();
    });

    test('3D chunk fails to load: page still works, no errors', async ({ page }) => {
        const problems = [];
        page.on('pageerror', (e) => problems.push(e.message));
        await page.route('**/js/chunks/renderer-*.js', (route) => route.abort());
        await page.goto('/');
        await page.waitForTimeout(3500);
        await expect(page.locator('html')).not.toHaveClass(/has-3d/);
        await expect(page.locator('h1')).toBeVisible();
        expect(problems).toEqual([]);
    });
});

test('404 page is served with a way home', async ({ page }) => {
    const res = await page.goto('/no/such/page');
    expect(res.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('404');
    await page.getByRole('link', { name: 'Back to home' }).click();
    await expect(page).toHaveURL(/\/$/);
});
