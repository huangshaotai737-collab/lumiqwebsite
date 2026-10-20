import { parse } from '@formatjs/icu-messageformat-parser';
import { icuSignature } from '@/lib/generated/platform/content-icu';
import { contentPolicy } from '@/lib/generated/platform/content-policy';
import { validateContentSnapshot } from '@/lib/generated/platform/content-validation';
import type { ContentSnapshot, ContentValidationOptions } from '@/lib/generated/platform/content';

export function parseSnapshot(input: unknown, options: ContentValidationOptions = {}): ContentSnapshot {
  const result = validateContentSnapshot(input, contentPolicy, message => icuSignature(parse(message)), options);
  if (!result.ok) throw new Error(result.issues.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
  return result.snapshot;
}
