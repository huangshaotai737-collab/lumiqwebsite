import manifest from './field-manifest.json';
import type { ContentField } from '@/lib/generated/platform/content';
export const fieldManifest = manifest as Omit<typeof manifest, 'fields'> & { fields: ContentField[] };
