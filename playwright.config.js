import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/** Smoke tests run against the production build, served with the production headers (CSP included). */
export default defineConfig({
    testDir: 'tests',
    fullyParallel: true,
    reporter: 'list',
    use: { baseURL: `http://localhost:${PORT}`, channel: 'chrome' },
    webServer: {
        command: `npm run build && node scripts/serve.mjs ${PORT}`,
        url: `http://localhost:${PORT}/`,
        reuseExistingServer: true,
    },
    projects: [
        { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
        { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    ],
});
