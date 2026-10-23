import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import path from "node:path";
const local = parseEnv(
  readFileSync(
    process.env.LUMIQ_TEST_ENV_FILE ||
      path.resolve(
        __dirname,
        "../../.lumiq-local/test.env",
      ),
    "utf8",
  ),
);
if (local.API_URL && local.API_URL !== 'http://127.0.0.1:54321') throw Error('Only synthetic local backend is allowed');

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "catalog.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4264", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node ../../scripts/start-team-admin-test.mjs",
    url: "http://127.0.0.1:4264/login",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: local.API_URL!,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.ANON_KEY!,
      SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY!,
      SUPABASE_SECRET_KEY: "",
      REQUEST_LIMIT_SALT: "lumiq-synthetic-auth-e2e-shared-salt-20261020",
      REQUEST_IP_HEADER: "x-real-ip",
      NEXT_TELEMETRY_DISABLED: "1",
      A4_TEST_PORT: "4264",
      APP_ORIGIN: "http://127.0.0.1:4264",
    },
  },
});
