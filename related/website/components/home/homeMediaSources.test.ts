import { describe, expect, it } from 'vitest';
import { homeLowSource } from './homeMediaSources';
describe('private preview artwork', () => {
  it('keeps the authenticated route out of the anonymous image optimizer', () => {
    const source = '/api/content/preview-media/60000000-0000-4000-8000-000000000001';
    expect(homeLowSource(source)).toBe(source);
  });
  it('decodes removed artwork without sending transparent SVGs to the optimizer', () => {
    expect(homeLowSource('/assets/content/empty-image.svg')).toBe('/assets/content/empty-image.svg');
  });
  it('retains optimized low resolution for public uploads', () => {
    expect(homeLowSource('/api/media/60000000-0000-4000-8000-000000000001')).toContain('/_next/image?url=');
  });
});
