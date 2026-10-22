import {defineConfig} from '@playwright/test';

// Read-only checks against an already running local production build. Never
// start/reset Supabase or create customer, staff, order or waitlist fixtures.
const origin = new URL(process.env.LUMIQ_BRAND_QA_ORIGIN || 'http://127.0.0.1:4211');
if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('Brand regression checks require a loopback-only origin');
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['streamed-content-hydration.spec.ts','hydration-host-replay.spec.ts','brand-polish-layout.spec.ts','home-product-card-layout.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: 'line',
  use: {baseURL: origin.origin, browserName: 'chromium', viewport: {width: 1440, height: 1000}, trace: 'retain-on-failure'},
});
