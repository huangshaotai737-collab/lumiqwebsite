import snapshot from './initial-snapshot.json';
import { parseSnapshot } from './parse';
/** Immutable source seed, not a public runtime adapter or a CMS persistence fallback. */
export const initialSnapshot = parseSnapshot(snapshot);
