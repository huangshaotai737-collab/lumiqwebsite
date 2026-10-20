import { listWaitlist } from "@/features/waitlist/service";
import { WaitlistTable } from "@/features/waitlist/WaitlistTable";
export default async function WaitlistPage() {
  const result = await listWaitlist({
    search: "",
    status: "all",
    page: 1,
    pageSize: 25,
  });
  if (!result.ok)
    return (
      <p role="alert">
        候补名单暂时不可用，或当前账号没有运营权限。请稍后重试。
      </p>
    );
  return (
    <>
      <h1>候补名单</h1>
      <p>处理报名、添加内部备注，导出当前筛选范围。</p>
      <WaitlistTable initial={result.data} />
    </>
  );
}
