import {initialSnapshot} from './initial-snapshot';
import {applyBrandRevision} from '@/lib/generated/platform/apply-brand-revision';
import {parseSnapshot} from './parse';
/** Current bundled content. The original import and historical IDs stay intact. */
export const currentSnapshot=parseSnapshot(applyBrandRevision(initialSnapshot).snapshot);
