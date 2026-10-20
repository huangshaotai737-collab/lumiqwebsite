import { loadMediaLibrary } from '@/features/media/service';
import { MediaLibrary } from '@/features/media/MediaLibrary';
export const dynamic = 'force-dynamic';
export default async function MediaPage() {
  let library;
  try { library = await loadMediaLibrary(); }
  catch { return <p role="alert">素材库暂不可用。请核对员工权限、私有存储配置和媒体探测环境。</p>; }
  return <><h1>素材库</h1><p>上传仅保存私有原件。管理员发布成功后，官网才能读取不可变副本。</p><MediaLibrary {...library} /></>;
}
