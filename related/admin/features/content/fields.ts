import manifest from './field-manifest.json';
import type { ContentField } from '@/lib/generated/platform/content';
/** Server-side editor inventory. B2 must enforce adminOnly in server + database writes.
 * Keep source locators out of public client payloads. */
export const contentFields = manifest.fields as ContentField[];
