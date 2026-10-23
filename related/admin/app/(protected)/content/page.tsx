import Link from 'next/link';
import { requireStaff } from '@/lib/auth/require-staff';
import { loadWorkspace } from '@/features/content/service';
import { CreateDraftButton } from '@/features/content/CreateDraftButton';
import { ReleaseHistory } from '@/features/content/ReleaseHistory';
export default async function ContentPage() {
  let data;
  try {
    data = await Promise.all([requireStaff(['admin', 'editor']), loadWorkspace()]);
  } catch {
    return <p role="alert">内容工作区暂不可用。仅管理员和内容编辑可访问，请检查当前权限或稍后重试。</p>;
  }
  const [actor, workspace] = data;
  return <>
    <h1>官网内容工作区</h1>
    <p>管理员与内容编辑共享草稿。发布与回滚仅限管理员，官网内容最多 60 秒内生效。</p>
    {!workspace.publishedReleaseId && <p className="notice">尚无已发布快照。管理员可从现有官网导入基线新建草稿；内容编辑需等待首次发布。</p>}
    <CreateDraftButton />
    <section className="panel">
      <h2>最近草稿</h2>
      {workspace.drafts.length ? <ul>{workspace.drafts.map(draft => <li key={draft.id}>
        <Link href={`/content/${draft.id}`}>草稿 {draft.id}</Link> · 版本 {draft.version} · {draft.status === 'submitted' ? '已提交审核' : '编辑中'}
      </li>)}</ul> : <p>尚无草稿。</p>}
    </section>
    <ReleaseHistory releases={workspace.releases} current={workspace.publishedReleaseId} admin={actor.role === 'admin'} />
  </>;
}
