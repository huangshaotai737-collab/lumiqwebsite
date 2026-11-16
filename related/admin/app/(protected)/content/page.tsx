import { HistoryPagination, historyPage } from '@/features/content/HistoryPagination';
import { RecentDrafts } from '@/features/content/DraftHistory';
import { requireStaff } from '@/lib/auth/require-staff';
import { loadWorkspace } from '@/features/content/service';
import { CreateDraftButton } from '@/features/content/CreateDraftButton';
import { ReleaseHistory } from '@/features/content/ReleaseHistory';
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ draftPage?: string | string[]; releasePage?: string | string[] }> }) {
  const query = await searchParams;
  let data;
  try {
    data = await Promise.all([requireStaff(['admin', 'editor']), loadWorkspace(historyPage(query.draftPage), historyPage(query.releasePage))]);
  } catch {
    return <p role="alert">內容工作區暫不可用。僅管理員和內容編輯可訪問，請檢查當前權限或稍後重試。</p>;
  }
  const [actor, workspace] = data;
  return <>
    <h1>官網內容工作區</h1>
    <p>管理員與內容編輯共享草稿。管理員發佈或回滾後，官網會在 60 秒內自動更新，無需重新部署網站。</p>
    {!workspace.publishedReleaseId && <p className="notice">尚無已發佈版本。管理員可使用現有官網內容建立草稿；內容編輯需等待管理員完成首次發佈。</p>}
    <CreateDraftButton />
    <RecentDrafts drafts={workspace.drafts} admin={actor.role === 'admin'} />
    <HistoryPagination kind="draft" pagination={workspace.draftPagination} otherPage={workspace.releasePagination.page} />
    <ReleaseHistory releases={workspace.releases} current={workspace.publishedReleaseId} admin={actor.role === 'admin'} />
    <HistoryPagination kind="release" pagination={workspace.releasePagination} otherPage={workspace.draftPagination.page} />
  </>;
}
