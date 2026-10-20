// Isolated code-only runtime; never touches app env files or active preview builds.
import { cp, mkdir, rm, symlink } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'related/admin');
const port = process.env.A4_TEST_PORT || '4257';
const runtime = path.join(
  root,
  `.superpowers/sdd/2026-10-20-lumiq-admin-platform/a4-admin-${port}-runtime`,
);
await rm(runtime, { recursive: true, force: true });
await mkdir(runtime, { recursive: true });
await cp(source, runtime, {
  recursive: true,
  filter: (file) =>
    !path
      .relative(source, file)
      .split(path.sep)
      .some(
        (part) =>
          part === 'node_modules' ||
          part.startsWith('.next') ||
          part.startsWith('.env') ||
          ['test-results', 'playwright-report', 'coverage'].includes(part),
      ),
});
await symlink(
  path.join(source, 'node_modules'),
  path.join(runtime, 'node_modules'),
);
const sockets = new Set();
const relays = new Set();
const relay =
  port === '4257'
    ? net
        .createServer((socket) => {
          sockets.add(socket);
          const child = spawn(
            'docker',
            [
              'exec',
              '-i',
              'supabase_inbucket_lumiq-platform',
              'nc',
              '127.0.0.1',
              '1025',
            ],
            {
              env: {
                ...process.env,
                DOCKER_HOST:
                  'unix:///Users/huangshaotai/.colima/lumiq-platform/docker.sock',
              },
              stdio: ['pipe', 'pipe', 'ignore'],
            },
          );
          relays.add(child);
          socket.pipe(child.stdin);
          child.stdout.pipe(socket);
          socket.on('error', () => child.kill());
          child.stdin.on('error', () => socket.destroy());
          socket.on('close', () => {
            sockets.delete(socket);
            child.kill();
          });
          child.on('exit', () => {
            relays.delete(child);
            socket.destroy();
          });
        })
        .listen(54325, '127.0.0.1')
    : null;
const server = spawn(
  process.execPath,
  [
    path.join(source, 'node_modules/next/dist/bin/next'),
    'dev',
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    port,
  ],
  { cwd: runtime, env: process.env, stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.kill(signal);
    relay?.close();
    for (const socket of sockets) socket.destroy();
    for (const child of relays) child.kill();
  });
server.on('exit', (code) => {
  relay?.close();
  process.exit(code || 0);
});
