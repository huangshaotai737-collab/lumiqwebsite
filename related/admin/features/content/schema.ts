import { parse } from '@formatjs/icu-messageformat-parser';
import { icuSignature } from '@/lib/generated/platform/content-icu';
import { contentPolicy } from '@/lib/generated/platform/content-policy';
import { validateContentSnapshot } from '@/lib/generated/platform/content-validation';
import type { ContentValidationOptions, ContentValidationResult } from '@/lib/generated/platform/content';

export function validateDraft(input: unknown, options: ContentValidationOptions = {}): ContentValidationResult {
  return validateContentSnapshot(input, contentPolicy, message => icuSignature(parse(message)), options);
}
