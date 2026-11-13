'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
/** Check only the small version pointer. Refresh preserves scroll and client state. */
export default function PublishedContentRefresh({ releaseId }: { releaseId: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/content/revision', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) });
        if (!response.ok) return;
        const next = await response.json();
        if (!controller.signal.aborted && next.releaseId && next.releaseId !== releaseId) router.refresh();
      } catch { /* Keep the current page if the version check cannot connect. */ }
    }
    const timer = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); };
  }, [releaseId, router]);
  return null;
}
