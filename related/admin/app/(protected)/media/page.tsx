import { loadMediaLibrary } from '@/features/media/service';
import { MediaLibrary } from '@/features/media/MediaLibrary';
import { HttpError } from '@/lib/http/result';
import type { MediaSearchParams } from '@/features/media/library-query';
export const dynamic = 'force-dynamic';
export default async function MediaPage({ searchParams }: { searchParams: Promise<MediaSearchParams> }) {
  let library;
  try { library = await loadMediaLibrary(await searchParams); }
  catch (error) { return <p role="alert">{error instanceof HttpError && error.code === 'INVALID_INPUT' ? '搜尋或篩選條件無效。請調整條件後重試，搜尋文字不可超過 100 字。' : '素材庫暫時無法載入。請確認帳號權限或稍後重試；若持續失敗，請聯絡系統管理員。'}</p>; }
  return <><h1>素材庫</h1><p>管理官網使用的圖片與影片。上傳後需在內容草稿中選用，經管理員發佈後才會更新官網。</p><MediaLibrary {...library} /></>;
}
