import seed from './initial-snapshot.json';
import {applyBrandRevision} from '@/lib/generated/platform/apply-brand-revision';
import {validateDraft} from './schema';
import type {ContentSnapshot} from '@/lib/generated/platform/content';
const result=validateDraft(applyBrandRevision(seed as ContentSnapshot).snapshot);
if(!result.ok)throw Error('Bundled brand content is invalid');
export const currentSnapshot=result.snapshot;
