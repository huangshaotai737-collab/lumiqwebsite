import { loadMediaLibrary } from '@/features/media/service';
import { MediaLibrary } from '@/features/media/MediaLibrary';
import { HttpError } from '@/lib/http/result';
import type { MediaSearchParams } from '@/features/media/library-query';
export const dynamic = 'force-dynamic';
export default async function MediaPage({ searchParams }: { searchParams: Promise<MediaSearchParams> }) {
  let library;
  try { library = await loadMediaLibrary(await searchParams); }
  catch (error) { return <p role="alert">{error instanceof HttpError && error.code === 'INVALID_INPUT' ? '搜索或筛选条件无效。请使用不超过 100 字的单一搜索词、有效筛选与正整数页码。' : '素材库暂不可用。请核对员工权限、私有存储配置和媒体探测环境。'}</p>; }
  return <><h1>素材库</h1><p>上传仅保存私有原件。管理员发布成功后，官网才能读取不可变副本。</p><MediaLibrary {...library} /></>;
}
