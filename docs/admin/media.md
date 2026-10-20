# 私有素材与发布交付

素材库 `/media` 仅供有效管理员、内容编辑使用。上传用途使用 manifest 的具体 slot key（`asset_...`），不是浏览器自报的通用 image/video 类型。静态图片支持 JPEG、PNG、WebP；影片支持对应原用途的 MP4/H264。`profiles.json` 和迁移中的 DB 私有策略由原始资源与代码用途核对后固定，不能在界面修改比例、时长、布局、动画或时间线。

开场片固定 16:9、24 fps、6.583333 秒，滚动背景固定 16:9、24 fps、30 秒，复杂片时长容差为一帧（1/24 秒）。普通影片保留原比例与 H264/yuv420p，最长 600 秒。配套 poster/静态 fallback 必须与对应视频一起选入同一发布快照并接受各自比例校验。开场保留起始/结束两张 poster；背景保留代码实际使用的 products fallback；品牌影片保留 StoryHeroVideo 的 family poster；三条轮播影片保留各自 jpg poster。宽高来自实际文件，不采用文件名或浏览器尺寸声明。受影响的代码时间线与响应式逻辑保持原样。

透明人物同时依赖 WebM、Safari HEVC MOV、poster 与 settled 图片。MOV 不在本期新上传允许格式（JPEG/PNG/WebP/MP4/WebM）内，也不能用 ffprobe 的 yuv420p 输出证明其 HEVC 辅助透明层。因此整组只读，界面显示原因，保留所有原站资源；不允许只替换某个浏览器变体，不声称透明人物替换已开通。任何后续开放都需受审的双格式透明验证与对应策略迁移。

## 运行前提

后台 API 使用 Node runtime。运行环境必须自行安装兼容的 `ffprobe` 并设置绝对路径 `MEDIA_FFPROBE_PATH`；本仓库不捆绑二进制，也不假定托管平台自带它。探测只读取随机临时目录中的实际上传文件，限制为 file 协议与 mov/png_pipe/jpeg_pipe/webp_pipe/matroska/webm 容器，MP4 显式设置 `-enable_drefs 0 -use_absolute_path 0` 禁用外部轨道和绝对路径别名，15 秒超时、1 MiB 输出，并在成功或失败后清理目录。缺少探测器时完成上传返回 UNAVAILABLE，不能绕过检查。当地 `/opt/homebrew/bin/ffprobe` 的验证不构成生产可用性证明。

操作员须核对 Supabase Storage 全局配置，将其实际字节限制设置为可信服务器变量 `MEDIA_STORAGE_MAX_BYTES`。应用没有使用未公开 API 去猜测全局限额；此变量缺失/非法时失败关闭。实际显示与上传校验上限为应用图片 20 MiB/视频 50 MiB、此全局值、实时原件桶限制的最小值；Storage 自身继续强制全局与桶限额。变更全局限制时必须同步此变量。两桶必须始终私有；实时发现 public 配置会停止上传/预览/发布或公开交付。迁移遇同名已存在桶会失败，不会接管、转为公开或修改其他桶。

上传需要后台和官网分别已有的服务器 Supabase 凭证，不能使用 NEXT_PUBLIC 前缀。原件桶 `media-originals`；发布副本桶 `media-releases`。数据库迁移创建它们为 private，并不建立任何浏览器 Storage 读取、更新或删除策略。服务只为当前员工创建的固定 `userId/assetId` 前缀签发一次不可覆盖的签名上传 URL（Storage 官方有效期 2 小时）。完成阶段再次检查有效员工、创建者、实际大小、文件头、探测元信息和用途限额。文件名扩展或 content-type 声称都不能代替实际验证。

后台图片/视频直接访问当前员工保护的 `/api/media/preview?assetId=UUID`。服务内部为固定原件路径生成 600 秒签名，再以 no-store 读取，给浏览器返回 private/no-store/nosniff。预览不经过公共图片优化器，浏览器不接收内部签名 URL。保护接口只接收 UUID，不接受 URL 或 Storage path。

## 发布与历史

管理员服务器先读取精确草稿版本并完整验证，`prepareReleaseAssets` 再重新读取、核对同版本/快照，重读原件验证其 SHA-256，将字节写入 `releases/assetId/SHA256` 的不可覆盖私有路径。重试仅可复用字节完全相同的孤立副本。服务器之后才为原精确版本申请 B2 单次校验凭据。并发保存导致版本/摘要冲突；不能发布混合快照。原 `/assets/` 引用无需复制。

最终 SQL 保留员工/发布锁、管理员与版本检查，在消费 B2 凭据前核对素材、真实可信种类/MIME/用途、私有对象存在性、归档状态与 poster 关系。新 release、素材引用证明、发布指针、审计均在一个事务中落库；任何失败不会公开孤立副本或改变当前版本。浏览器不能直接编辑素材表、完成元信息、标记副本或建立发布引用。

归档隐藏新选择，保留原件、副本、历史 URL 与历史回滚。每个新草稿的 `base_release_id` 由 DB 自动取创建时的当前发布版本并固定；浏览器不能指定。只允许在相同 slot 中保留与该可信基线一致的已归档 assetId/URL/kind/profile，因此归档不会妨碍修改当前页面的其他内容。可以用新有效素材替换；不能因为某资产出现在任意历史中就加入无关草稿/另一 slot。回滚单独要求目标不可变 release 的精确发布引用证明。历史引用有 FK 删除保护，没有删除/清理历史素材接口。

官网 GET `/api/media/UUID` 独立构建、只使用服务器权限。先验证私有固定桶配置与 `get_public_asset` 的已发布历史引用证明，再读取 DB 固定 `releases/UUID/SHA256` 路径。草稿、未发布、复制失败或伪造 path 一律 404/no-store。有效资源返回可信 MIME、nosniff、不可变缓存及单段 Range/206/416，保持视频播放/拖动与下载行为。当前实现最多缓冲单个 50 MiB 对象，Range 也先读取完整对象；大规模视频流量应另行评估代理运行时内存与带宽，但不能通过公开桶绕过证明边界。

## 本地验证

`npm --prefix related/admin run test:e2e -- media-library.spec.ts` 使用真实本地 Auth、Storage、Postgres 和 4260/4261 独立代码副本，合成蓝 PNG/JPEG/WebP、红 H264 视频，不读取或改写原应用环境/预览。单测需要本地已安装的 `/opt/homebrew/bin/ffprobe`；它是显式本地测试前提。运行后测试用户删除，发布过的合成历史/对象保留在本地，后续本地 reset 可清理；没有远端资源或真实用户。
