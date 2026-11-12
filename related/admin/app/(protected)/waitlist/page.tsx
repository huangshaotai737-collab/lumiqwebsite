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
        候補名單暫時不可用，或當前賬號沒有運營權限。請稍後重試。
      </p>
    );
  return (
    <>
      <h1>候補名單</h1>
      <p>處理報名、添加內部備註，導出當前篩選範圍。</p>
      <WaitlistTable initial={result.data} />
    </>
  );
}
