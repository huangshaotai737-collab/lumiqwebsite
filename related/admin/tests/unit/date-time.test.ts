import {afterEach, expect, it, vi} from 'vitest';
import {formatAdminDateTime} from '../../lib/date-time';

afterEach(() => vi.unstubAllEnvs());

it('shows the same Beijing timestamp across server and browser host timezones', () => {
  for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
    vi.stubEnv('TZ', zone);
    expect(formatAdminDateTime('2026-11-03T04:05:07.000Z')).toBe('2026/11/3 12:05:07');
  }
});
