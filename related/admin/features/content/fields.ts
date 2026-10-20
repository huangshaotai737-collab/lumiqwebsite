import retired from './retired-account-fields.json';
import manifest from './field-manifest.json';
import type { ContentField } from '@/lib/generated/platform/content';
/** Server-side editor inventory. B2 must enforce adminOnly in server + database writes.
 * Keep source locators out of public client payloads. */
const retiredPaths = new Set(retired.fields.map(field => field.path));
export const contentFields = (manifest.fields as ContentField[]).filter(field => !retiredPaths.has(field.path));
