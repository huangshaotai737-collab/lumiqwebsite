'use client';
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
      if (!result.ok) { setError('回滚失败，请检查当前权限或稍后重试。'); return; }
      setMessage('已创建回滚版本，官网内容将在 60 秒内生效。'); router.refresh();
    } catch { setError('回滚服务暂不可用。'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section aria-label="发布记录"><h2>发布与回滚记录</h2><p role="status">{message}</p>{error && <p role="alert">{error}</p>}
    {releases.length === 0 ? <p>尚无已发布版本。</p> : <div className="table-scroll" tabIndex={0} aria-label="版本记录"><table><thead><tr><th>版本</th><th>来源</th><th>时间</th>{admin && <th>操作</th>}</tr></thead><tbody>{releases.map(release => <tr key={release.id}>
      <td><code>{release.id}</code>{current === release.id && <p>当前官网版本</p>}</td><td>{release.rollbackOf ? <>回滚自 <code>{release.rollbackOf}</code></> : `草稿版本 ${release.draftVersion}`}</td><td>{new Date(release.createdAt).toLocaleString('zh-CN')}</td>
      {admin && <td><button disabled={busy || current === release.id} onClick={() => rollback(release.id)}>回滚至此版本</button></td>}
    </tr>)}</tbody></table></div>}
  </section>;
}
