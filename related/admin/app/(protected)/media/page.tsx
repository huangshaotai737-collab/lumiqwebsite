import { loadMediaLibrary } from '@/features/media/service';
import { MediaLibrary } from '@/features/media/MediaLibrary';
import { HttpError } from '@/lib/http/result';
import type { MediaSearchParams } from '@/features/media/library-query';
export const dynamic = 'force-dynamic';
export default async function MediaPage({ searchParams }: { searchParams: Promise<MediaSearchParams> }) {
  let library;
  try { library = await loadMediaLibrary(await searchParams); }
  catch (error) { return <p role="alert">{error instanceof HttpError && error.code === 'INVALID_INPUT' ? '搜索或篩選條件無效。請使用不超過 100 字的單一搜索詞、有效篩選與正整數頁碼。' : '素材庫暫不可用。請核對員工權限、私有存儲配置和媒體探測環境。'}</p>; }
  return <><h1>素材庫</h1><p>上傳僅保存私有原件。管理員發佈成功後，官網才能讀取不可變副本。</p><MediaLibrary {...library} /></>;
}
