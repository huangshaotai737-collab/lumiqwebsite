import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';
const auth = process.argv.some(value=>value.includes('staff-session.spec')) || process.env.LUMIQ_AUTH_E2E === '1';
if (auth) process.env.LUMIQ_AUTH_E2E = '1';
const local = auth ? parseEnv(readFileSync(process.env.LUMIQ_TEST_ENV_FILE || path.resolve(__dirname,'../../.superpowers/sdd/2026-10-20-lumiq-admin-platform/a3.env'),'utf8')) : {};
const credentials = {
  NEXT_PUBLIC_SUPABASE_URL: auth ? local.API_URL! : '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: auth ? local.ANON_KEY! : '',
  SUPABASE_SERVICE_ROLE_KEY: auth ? local.SERVICE_ROLE_KEY! : '',
  SUPABASE_SECRET_KEY:'',SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',
  REQUEST_LIMIT_SALT:auth ? 'lumiq-synthetic-auth-e2e-shared-salt-20261020' : '',
  REQUEST_IP_HEADER:auth ? 'x-real-ip' : '',
  NEXT_TELEMETRY_DISABLED:'1',
};
export default defineConfig({
  testDir:'./tests/e2e',testMatch:auth ? '**/staff-session.spec.ts' : '**/shell.spec.ts',fullyParallel:!auth,
  forbidOnly:Boolean(process.env.CI),retries:0,reporter:'list',timeout:60_000,
  use:{baseURL:auth ? 'http://127.0.0.1:4253' : 'http://127.0.0.1:4250',trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:auth ? [
    {command:'npx next dev --hostname 127.0.0.1 --port 4253',url:'http://127.0.0.1:4253/login',reuseExistingServer:false,timeout:120_000,env:{...credentials,APP_ORIGIN:'http://127.0.0.1:4253'}},
    {command:'node ../../scripts/start-auth-website-test.mjs',url:'http://127.0.0.1:4254/en/login',reuseExistingServer:false,timeout:120_000,env:{...credentials,APP_ORIGIN:'http://127.0.0.1:4254'}},
  ] : {command:'npm run dev',url:'http://127.0.0.1:4250',reuseExistingServer:false,timeout:120_000,env:{...credentials,APP_ORIGIN:''}},
});
