import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', workers: 1, retries: 0, timeout: 120000,
  outputDir: '.cloudflare/e2e/artifacts',
  reporter: [['list'], ['json', { outputFile: '.cloudflare/e2e/results.json' }]],
  // Ephemeral self-signed local fixture certificate; production HTTPS is checked separately.
  use: { baseURL: 'https://localhost:5443', ignoreHTTPSErrors: true, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: ['chromium', 'firefox', 'webkit'].map(browserName => ({ name: browserName, use: { browserName } })),
});
