#!/usr/bin/env node
// Server operator CLI only. Does not provision Auth accounts, passwords or public routes.
import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../related/admin/package.json', import.meta.url),
);
const { createClient } = require('@supabase/supabase-js');
const args = process.argv.slice(2);
if (
  args.length !== 2 ||
  args[0] !== '--email' ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args[1]) ||
  args[1].length > 254
) {
  process.stderr.write(
    'Usage: node scripts/bootstrap-admin.mjs --email <confirmed-account-email>\n',
  );
  process.exit(1);
}
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  process.stderr.write('Server Supabase URL and secret key are required.\n');
  process.exit(1);
}
try {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.rpc('bootstrap_staff_admin', {
    email: args[1].trim().toLowerCase(),
  });
  if (error) {
    const message =
      error.message === 'CONFLICT'
        ? 'Refused: an administrator already exists.'
        : error.message === 'CONFIRMED_ACCOUNT_REQUIRED'
          ? 'Refused: existing confirmed active account required.'
          : 'Bootstrap failed; no administrator created.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  } else process.stdout.write('First administrator created and audited.\n');
} catch {
  process.stderr.write(
    'Bootstrap unavailable; no credentials or account details logged.\n',
  );
  process.exitCode = 1;
}
