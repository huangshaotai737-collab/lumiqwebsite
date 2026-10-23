import manifest from './field-manifest.json';
import type { ContentField } from '@/lib/generated/platform/content';
import {brandContentFields} from '@/lib/generated/platform/brand-content-fields';
import {isActiveBrandContentField} from '@/lib/generated/platform/brand-replacements';
export const fieldManifest = {...manifest,fields:[...manifest.fields as ContentField[],...brandContentFields]};
export const activeContentFields=fieldManifest.fields.filter(field=>isActiveBrandContentField(field.path));
