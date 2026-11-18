import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['dist/', '_refs/', 'node_modules/', 'test-results/', 'playwright-report/', '.*.mjs'] },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.browser },
        rules: {
            'no-implicit-globals': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: 'error',
            'no-console': ['error', { allow: ['info'] }],
        },
    },
    {
        files: ['scripts/**/*.mjs', 'tests/**/*.js', '*.config.js'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    },
];
