import type { ContentSnapshot, MediaSlot } from '@/lib/generated/platform/content';
export function resolveMediaSlot(snapshot: ContentSnapshot, slotId: string): MediaSlot {
  const slot = snapshot.media[slotId];
  if (!slot) throw new Error(`Unknown media slot: ${slotId}`);
  return slot;
}
