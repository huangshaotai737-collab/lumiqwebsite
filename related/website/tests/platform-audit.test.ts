import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// The full fixture writes thousands of stage records and 891 checks. Its runner
// guardrail allows concurrent builds; individual audit operations still get 20ms.
const auditTest = (name: string, run: () => Promise<void>) => test(name, run, 20000);

const scenario = vi.hoisted(() => ({
  hang: '' as 'fonts' | 'evaluate' | 'close' | 'second-route' | '',
  overflowAt: 0,
  nativeTimeout: false,
  onSecondRoute: undefined as (() => Promise<void>) | undefined,
}));

// Replace only the browser boundary: report files, deadlines and the audit itself are real.
vi.mock('@playwright/test', () => {
  const pending = () => new Promise(() => {});
  const engine = {
    async launch() {
      let viewport = {width: 0, height: 0};
      let visits = 0;
      const page = {
        on() {},
        setDefaultTimeout() {},
        setDefaultNavigationTimeout() {},
        async goto() {
          visits += 1;
          if (visits === 2 && scenario.hang === 'second-route') {
            await scenario.onSecondRoute?.();
            return pending();
          }
          return {status: () => 200};
        },
        locator: () => ({waitFor: async () => {}}),
        async waitForFunction(fn: () => unknown) {
          if (fn.toString().includes('document.fonts')) {
            if (scenario.nativeTimeout) {
              const error = new Error('Browser operation timed out');
              error.name = 'TimeoutError';
              throw error;
            }
            if (scenario.hang === 'fonts') return pending();
          }
          return {dispose: async () => {}};
        },
        async waitForTimeout() {},
        async setViewportSize(next: typeof viewport) {viewport = next;},
        async evaluate() {
          if (scenario.hang === 'evaluate') return pending();
          return {
            overflow: viewport.width === scenario.overflowAt,
            overlaps: false,
            wrongColor: [],
            memberReadable: true,
            legacy: 0,
          };
        },
        async screenshot() {},
      };
      return {
        newPage: async () => page,
        close: async () => scenario.hang === 'close' ? pending() : undefined,
      };
    },
  };
  return {chromium: engine, firefox: engine, webkit: engine};
});

let output: string;
beforeEach(async () => {
  vi.resetModules();
  output = await fs.mkdtemp(path.join(os.tmpdir(), 'lumiq-platform-test-'));
  vi.stubEnv('QA_OUTPUT', output);
  vi.stubEnv('AUDIT_TIMEOUT_MS', '20');
  vi.stubEnv('TEST_EDGE', '0');
  scenario.hang = '';
  scenario.overflowAt = 0;
  scenario.nativeTimeout = false;
  scenario.onSecondRoute = undefined;
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function runAudit() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      import('../scripts/check-release-platform.mjs').then(
        () => ({outcome: 'passed'}),
        (error: Error) => ({outcome: 'failed', error}),
      ),
      new Promise<{outcome: string}>(resolve => {
        timer = setTimeout(() => resolve({outcome: 'test-deadline'}), 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function report() {
  return JSON.parse(await fs.readFile(path.join(output, 'platform-report.json'), 'utf8'));
}

for (const stage of ['fonts', 'evaluate', 'close'] as const) {
  auditTest(`a stalled ${stage} operation fails with its stage instead of hanging`, async () => {
    scenario.hang = stage;
    const result = await runAudit();
    expect(result.outcome).toBe('failed');
    const saved = await report();
    expect(saved.status).toBe('failed');
    expect(saved.failures).toHaveLength(3);
    expect(saved.failures).toEqual(expect.arrayContaining([
      expect.objectContaining({stage, code: 'AUDIT_OPERATION_TIMEOUT'}),
    ]));
    const progress = (await fs.readFile(path.join(output, 'platform-progress.jsonl'), 'utf8'))
      .trim().split('\n').map(line => JSON.parse(line));
    expect(progress).toEqual(expect.arrayContaining([
      expect.objectContaining({stage, status: 'started'}),
      expect.objectContaining({stage, status: 'failed', code: 'AUDIT_OPERATION_TIMEOUT'}),
    ]));
    if (stage === 'close') expect(saved.checks).toHaveLength(891);
  });
}

auditTest('a native browser timeout is recorded as a timeout failure', async () => {
  scenario.nativeTimeout = true;
  expect((await runAudit()).outcome).toBe('failed');
  expect((await report()).failures).toEqual(expect.arrayContaining([
    expect.objectContaining({stage: 'fonts', code: 'AUDIT_OPERATION_TIMEOUT'}),
  ]));
});

auditTest('the first completed route is on disk before the next navigation finishes', async () => {
  scenario.hang = 'second-route';
  const snapshots: unknown[] = [];
  scenario.onSecondRoute = async () => {
    try {snapshots.push(await report());} catch {snapshots.push(undefined);}
  };
  const result = await runAudit();
  expect(result.outcome).toBe('failed');
  expect(snapshots[0]).toEqual(expect.objectContaining({
    status: 'running',
    checks: expect.arrayContaining([
      expect.objectContaining({engine: 'chromium', locale: 'en', route: ''}),
    ]),
  }));
});

auditTest('the added intermediate viewport is checked and its overflow fails the audit', async () => {
  scenario.overflowAt = 1100;
  const result = await runAudit();
  expect(result.outcome).toBe('failed');
  const saved = await report();
  expect(saved.failures).toEqual(expect.arrayContaining([
    expect.objectContaining({viewport: {width: 1100, height: 1000}, overflow: true}),
  ]));
});

auditTest('a successful audit measures all nine viewport sizes and finishes its report', async () => {
  const result = await runAudit();
  expect(result.outcome).toBe('passed');
  const saved = await report();
  expect(saved.status).toBe('passed');
  expect(saved.failures).toEqual([]);
  expect(saved.checks).toHaveLength(891);
  expect(saved.checks).toEqual(expect.arrayContaining([
    expect.objectContaining({viewport: {width: 1024, height: 1280}}),
    expect.objectContaining({viewport: {width: 1100, height: 1000}}),
    expect.objectContaining({viewport: {width: 1280, height: 720}}),
  ]));
});
