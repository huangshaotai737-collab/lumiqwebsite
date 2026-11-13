import path from 'node:path';
import {localRoot,prepareMirror,captureLocal} from './local.mjs';
await captureLocal();
await prepareMirror(path.join(localRoot,'verification'),{install:!process.argv.includes('--refresh')});
