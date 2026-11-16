import { parse } from '@formatjs/icu-messageformat-parser';
import { icuSignature } from '@/lib/generated/platform/content-icu';
import { contentPolicy } from '@/lib/generated/platform/content-policy';
import { brandContentPolicy } from '@/lib/generated/platform/brand-content-fields';
import { validateContentSnapshot } from '@/lib/generated/platform/content-validation';
import { withBrandContent } from '@/lib/generated/platform/brand-content';
import type { ContentSnapshot, ContentValidationOptions } from '@/lib/generated/platform/content';

export function parseSnapshot(input: unknown, options: ContentValidationOptions = {}): ContentSnapshot {
  const result = validateContentSnapshot(input, [...contentPolicy,...brandContentPolicy], message => icuSignature(parse(message)), options);
  if (!result.ok) throw new Error(result.issues.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
  return result.snapshot;
}

/** Historical releases can predate additive namespaces. Supply their display
 * defaults only after validation; keep saved copy and persisted snapshots intact. */
export function parseDisplaySnapshot(input: unknown): ContentSnapshot {
  return withBrandContent(parseSnapshot(input));
}
