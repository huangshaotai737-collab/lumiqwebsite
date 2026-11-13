import { RecentDrafts } from '@/features/content/DraftHistory';
import { requireStaff } from '@/lib/auth/require-staff';
import { loadWorkspace } from '@/features/content/service';
import { CreateDraftButton } from '@/features/content/CreateDraftButton';
import { ReleaseHistory } from '@/features/content/ReleaseHistory';
export default async function ContentPage() {
  let data;
  try {
    data = await Promise.all([requireStaff(['admin', 'editor']), loadWorkspace()]);
  } catch {
    return <p role="alert">內容工作區暫不可用。僅管理員和內容編輯可訪問，請檢查當前權限或稍後重試。</p>;
  }
  const [actor, workspace] = data;
  return <>
    <h1>官網內容工作區</h1>
    <p>管理員與內容編輯共享草稿。發佈與回滾僅限管理員，官網內容最多 60 秒內生效。</p>
    {!workspace.publishedReleaseId && <p className="notice">尚無已發佈版本。管理員可使用現有官網內容建立草稿；內容編輯需等待管理員完成首次發佈。</p>}
    <CreateDraftButton />
    <RecentDrafts drafts={workspace.drafts} />
    <ReleaseHistory releases={workspace.releases} current={workspace.publishedReleaseId} admin={actor.role === 'admin'} />
  </>;
}
