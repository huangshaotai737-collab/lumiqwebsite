'use client';
import { DeleteRecordButton } from './DeleteRecordButton';
import {formatAdminDateTime} from '@/lib/date-time';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentRelease } from './service';
export function ReleaseHistory({ releases, current, admin }: { releases: ContentRelease[]; current: string | null; admin: boolean }) {
  const router = useRouter(); const lock = useRef(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  async function rollback(releaseId: string) {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/content/rollback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ releaseId }) });
      const result = await response.json();
      if (!result.ok) { setError('回滾失敗，請檢查當前權限或稍後重試。'); return; }
      setMessage('已建立回滾版本，官網內容將在 60 秒內自動更新。'); router.refresh();
    } catch { setError('回滾服務暫不可用。'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section id="release-history" aria-label="發佈記錄"><h2>發佈與回滾記錄</h2><p>目前官網使用的版本不可刪除。刪除其他記錄不會更改官網內容。</p><p role="status">{message}</p>{error && <p role="alert">{error}</p>}
    {releases.length === 0 ? <p>尚無已發佈版本。</p> : <div className="table-scroll" tabIndex={0} aria-label="版本記錄"><table><thead><tr><th>版本</th><th>來源</th><th>時間</th>{admin && <th>操作</th>}</tr></thead><tbody>{releases.map(release => <tr key={release.id}>
      <td><code>{release.id}</code>{current === release.id && <p>當前官網版本</p>}</td><td>{release.rollbackOf ? <>回滾自 <code>{release.rollbackOf}</code></> : `草稿版本 ${release.draftVersion}`}</td><td>{formatAdminDateTime(release.createdAt)}</td>
      {admin && <td><button disabled={busy || current === release.id} onClick={() => rollback(release.id)}>回滾至此版本</button><DeleteRecordButton kind="release" id={release.id} name={formatAdminDateTime(release.createdAt)} disabled={busy || current === release.id} /></td>}
    </tr>)}</tbody></table></div>}
  </section>;
}
