import { parse } from '@formatjs/icu-messageformat-parser';
import { icuSignature } from '@/lib/generated/platform/content-icu';
import { contentPolicy } from '@/lib/generated/platform/content-policy';
import { brandContentPolicy } from '@/lib/generated/platform/brand-content-fields';
import { validateContentSnapshot } from '@/lib/generated/platform/content-validation';
import type { ContentValidationOptions, ContentValidationResult } from '@/lib/generated/platform/content';

export function validateDraft(input: unknown, options: ContentValidationOptions = {}): ContentValidationResult {
  return validateContentSnapshot(input, [...contentPolicy,...brandContentPolicy], message => icuSignature(parse(message)), options);
}
