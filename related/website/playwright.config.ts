import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4191",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
  webServer: {
    command:
      "LUMIQ_NEXT_DIST_DIR=.next-e2e npm run dev -- --hostname 127.0.0.1 --port 4191",
    url: "http://127.0.0.1:4191/en",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
