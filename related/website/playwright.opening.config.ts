import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['opening-anchors.spec.ts', 'home-entry-loading.spec.ts'],
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: 'line',
  outputDir: 'test-results/opening-anchors',
  use: {baseURL: 'http://127.0.0.1:4211', viewport: {width: 1440, height: 900}, trace: 'retain-on-failure'},
  projects: [
    {name: 'chromium', use: {browserName: 'chromium'}},
    {name: 'firefox', use: {browserName: 'firefox'}},
    {name: 'webkit', use: {browserName: 'webkit'}},
  ],
});
