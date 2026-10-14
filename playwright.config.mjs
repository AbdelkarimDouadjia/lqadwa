import { defineConfig } from '@playwright/test';
import assert from 'node:assert/strict';

const localCertificate = process.env.LQADWA_TEST_TLS_SPKI;
assert(localCertificate && /^[A-Za-z0-9+/]{43}=$/.test(localCertificate), 'Run through npm run test:e2e for isolated TLS fixtures');

export default defineConfig({
  testDir: './tests/browser', workers: 1, retries: 0, timeout: 120000,
  outputDir: '.cloudflare/e2e/artifacts',
  reporter: [['list'], ['json', { outputFile: '.cloudflare/e2e/results.json' }]],
  // Ephemeral self-signed local fixture certificate; production HTTPS is checked separately.
  use: { baseURL: 'https://localhost:5443', ignoreHTTPSErrors: true, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: ['chromium', 'firefox', 'webkit'].map(browserName => ({ name: browserName, use: {
    browserName,
    ...(browserName === 'chromium' ? { ignoreHTTPSErrors: false, launchOptions: { args: ['--ignore-certificate-errors-spki-list=' + localCertificate] } } : {}),
  } })),
});
