import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';
const suite = process.env.LUMIQ_PLATFORM_SUITE || 'shell';
if (!['shell','auth','team','content','media'].includes(suite)) throw Error('Unknown platform suite');
const media = suite === 'media', content = suite === 'content', team = suite === 'team';
const auth = suite !== 'shell';
if (auth) process.env.LUMIQ_AUTH_E2E='1';
const local = auth
  ? parseEnv(
      readFileSync(
        process.env.LUMIQ_TEST_ENV_FILE ||
          path.resolve(
            __dirname,
            '../../.lumiq-local/test.env',
          ),
        'utf8',
      ),
    )
  : {};
if (local.API_URL && local.API_URL !== 'http://127.0.0.1:54321') throw Error('Only synthetic local backend is allowed');

const credentials = {
  NEXT_PUBLIC_SUPABASE_URL: auth ? local.API_URL! : '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: auth ? local.ANON_KEY! : '',
  SUPABASE_SERVICE_ROLE_KEY: auth ? local.SERVICE_ROLE_KEY! : '',
  SUPABASE_SECRET_KEY: '',
  SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  REQUEST_LIMIT_SALT: auth
    ? 'lumiq-synthetic-auth-e2e-shared-salt-20261020'
    : '',
  REQUEST_IP_HEADER: auth ? 'x-real-ip' : '',
  MEDIA_STORAGE_MAX_BYTES: '52428800',
  MEDIA_FFPROBE_PATH: process.env.MEDIA_FFPROBE_PATH || 'ffprobe',
  NEXT_TELEMETRY_DISABLED: '1',
};
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: media ? '**/media-library.spec.ts' : content ? '**/content-editor.spec.ts' : team
    ? '**/team.spec.ts'
    : auth
      ? '**/staff-session.spec.ts'
      : ['**/shell.spec.ts','**/admin-responsive.spec.ts'],
  fullyParallel: !auth,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: media ? 'http://127.0.0.1:4260' : content ? 'http://127.0.0.1:4259' : team
      ? 'http://127.0.0.1:4257'
      : auth
        ? 'http://127.0.0.1:4253'
        : 'http://127.0.0.1:4250',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: media ? [
    { command: 'node ../../scripts/start-team-admin-test.mjs', url: 'http://127.0.0.1:4260/login', reuseExistingServer: false, timeout: 120_000, env: { ...credentials, A4_TEST_PORT: '4260', APP_ORIGIN: 'http://127.0.0.1:4260' } },
    { command: 'node ../../scripts/start-auth-website-test.mjs', url: 'http://127.0.0.1:4261/en/login', reuseExistingServer: false, timeout: 120_000, env: { ...credentials, LUMIQ_WEBSITE_TEST_PORT: '4261', APP_ORIGIN: 'http://127.0.0.1:4261' } },
  ] : content ? {
    command: 'node ../../scripts/start-team-admin-test.mjs', url: 'http://127.0.0.1:4259/login', reuseExistingServer: false, timeout: 120_000,
    env: { ...credentials, A4_TEST_PORT: '4259', APP_ORIGIN: 'http://127.0.0.1:4259' },
  } : team
    ? [4257, 4258].map((port) => ({
        command: 'node ../../scripts/start-team-admin-test.mjs',
        url: `http://127.0.0.1:${port}/login`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...credentials,
          A4_TEST_PORT: String(port),
          APP_ORIGIN: `http://127.0.0.1:${port}`,
          SMTP_HOST: '127.0.0.1',
          SMTP_PORT: port === 4257 ? '54325' : '1',
          STAFF_INVITE_FROM: 'LumiQ <staff@example.test>',
        },
      }))
    : auth
      ? [
          {
            command: 'node ../../scripts/start-team-admin-test.mjs',
            url: 'http://127.0.0.1:4253/login',
            reuseExistingServer: false,
            timeout: 120_000,
            env: { ...credentials, A4_TEST_PORT: '4253', APP_ORIGIN: 'http://127.0.0.1:4253' },
          },
          {
            command: 'node ../../scripts/start-auth-website-test.mjs',
            url: 'http://127.0.0.1:4254/en/login',
            reuseExistingServer: false,
            timeout: 120_000,
            env: { ...credentials, APP_ORIGIN: 'http://127.0.0.1:4254' },
          },
        ]
      : {
          command: 'node ../../scripts/start-team-admin-test.mjs',
          url: 'http://127.0.0.1:4250',
          reuseExistingServer: false,
          timeout: 120_000,
          env: { ...credentials, A4_TEST_PORT: '4250', APP_ORIGIN: '' },
        },
});
