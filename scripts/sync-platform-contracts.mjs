import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const sourceDirectory = path.join(root, 'contracts');
const destinations = ['related/admin/lib/generated/platform', 'related/website/lib/generated/platform'];
const banner = '// Generated from contracts/ by scripts/sync-platform-contracts.mjs. Do not edit.\n';

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative));
    else if (entry.name.endsWith('.ts')) result.push(relative);
  }
  return result.sort();
}

const sources = await files(sourceDirectory);
let differences = 0;
for (const destination of destinations) {
  const directory = path.join(root, destination);
  let existing = [];
  try { existing = await files(directory); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const relative of sources) {
    const output = path.join(directory, relative);
    const expected = banner + await readFile(path.join(sourceDirectory, relative), 'utf8');
    let actual;
    try { actual = await readFile(output, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (actual === expected) continue;
    differences++;
    if (check) console.error(`Contract out of sync: ${destination}/${relative}`);
    else {
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, expected);
    }
  }
  for (const relative of existing.filter((file) => !sources.includes(file))) {
    differences++;
    if (check) console.error(`Obsolete generated contract: ${destination}/${relative}`);
    else await rm(path.join(directory, relative));
  }
}
if (check && differences) process.exitCode = 1;
else console.log(check ? 'Platform contracts are in sync.' : 'Platform contracts synchronized.');
