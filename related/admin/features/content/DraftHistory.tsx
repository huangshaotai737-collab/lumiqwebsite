import Link from 'next/link';
import { formatAdminDateTime } from '@/lib/date-time';
import type { ContentDraft } from './service';
import { draftName, type DraftChange } from './draft-details';
export function RecentDrafts({ drafts }: { drafts: Omit<ContentDraft, 'snapshot'>[] }) {
  return <section className="panel"><h2>最近草稿</h2>{drafts.length ? <div className="table-scroll" tabIndex={0} aria-label="最近草稿記錄"><table className="draft-history"><thead><tr><th>草稿名稱</th><th>最近修改摘要</th><th>版本與狀態</th><th>建立時間</th><th>最後修改時間</th><th>操作</th></tr></thead><tbody>{drafts.map(draft => <tr key={draft.id}>
    <td><Link href={`/content/${draft.id}`}>{draftName(draft)}</Link></td><td>{draft.summary || '早期草稿，編輯時可補上摘要'}</td><td>第 {draft.version} 版 · {draft.status === 'submitted' ? '已提交審核' : '編輯中'}</td>
    <td>{draft.createdAt ? formatAdminDateTime(draft.createdAt) : '早期記錄'}</td><td>{formatAdminDateTime(draft.updatedAt)}</td><td><Link href={`/content/${draft.id}`}>編輯草稿</Link></td>
  </tr>)}</tbody></table></div> : <p>尚無草稿。</p>}</section>;
}
export function DraftChanges({ changes }: { changes: DraftChange[] }) {
  return <section className="panel"><h2>草稿修改記錄</h2><p>每次保存都會記錄名稱、摘要與時間。此處列出最近 50 次保存。</p>{changes.length ? <div className="table-scroll" tabIndex={0} aria-label="草稿修改記錄"><table className="draft-history"><thead><tr><th>版本</th><th>草稿名稱</th><th>修改摘要</th><th>保存時間</th></tr></thead><tbody>{changes.map(change => <tr key={change.version}><td>第 {change.version} 版</td><td>{change.name}</td><td>{change.summary}</td><td>{formatAdminDateTime(change.savedAt)}</td></tr>)}</tbody></table></div> : <p>此草稿建立於早期版本，下一次保存起會留下修改摘要。</p>}</section>;
}
