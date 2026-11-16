import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ effect: undefined as undefined | (() => (() => void)), refresh: vi.fn() }));
vi.mock('react', () => ({ useEffect: (effect: () => () => void) => { state.effect = effect; } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: state.refresh }) }));
import PublishedContentRefresh from './PublishedContentRefresh';
let dispose: () => void;
beforeEach(() => {
  vi.useFakeTimers(); state.refresh.mockReset();
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const window = Object.assign(new EventTarget(), { setInterval, clearInterval });
  vi.stubGlobal('document', document); vi.stubGlobal('window', window); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ releaseId: 'old' }) }));
  PublishedContentRefresh({ releaseId: 'old' }); dispose = state.effect!();
});
afterEach(() => { dispose(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('published content synchronization', () => {
  it('only refreshes on a changed public release, without a deployment or page reload', async () => {
    await vi.advanceTimersByTimeAsync(30_000); expect(state.refresh).not.toHaveBeenCalled();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ releaseId: 'new' }) } as Response);
    await vi.advanceTimersByTimeAsync(30_000); expect(state.refresh).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('/api/content/revision', expect.objectContaining({ cache: 'no-store' }));
  });
  it('pauses hidden pages and checks when the page becomes visible', async () => {
    Object.assign(document, { visibilityState: 'hidden' });
    await vi.advanceTimersByTimeAsync(30_000); expect(fetch).not.toHaveBeenCalled();
    Object.assign(document, { visibilityState: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0); expect(fetch).toHaveBeenCalledOnce();
  });
  it('preserves the current page on failed checks and removes timers and listeners', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));
    await vi.advanceTimersByTimeAsync(30_000); expect(state.refresh).not.toHaveBeenCalled();
    dispose(); vi.mocked(fetch).mockClear(); window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(60_000); expect(fetch).not.toHaveBeenCalled();
  });
});
