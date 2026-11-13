import { getDashboard } from "@/features/dashboard/service";
import { Dashboard as Metrics } from "@/features/dashboard/Dashboard";
import { redirect } from "next/navigation";
import { authConfigured } from "@/lib/auth/server";
import { HttpError } from "@/lib/http/result";
import { requireStaff } from "@/lib/auth/require-staff";
import { SignOutButton } from "@/features/auth/SignOutButton";
export default async function Dashboard() {
  if (!authConfigured()) return null;
  let staff;
  try {
    staff = await requireStaff(["admin", "editor", "operations"]);
  } catch (error) {
    if (error instanceof HttpError && error.status === 401)
      redirect("/login?error=session");
    if (error instanceof HttpError && error.status === 403)
      redirect("/login?error=forbidden");
    return <p role="status">認證服務暫時不可用，請稍後重試。</p>;
  }
  const metrics = await getDashboard();
  const roles = { admin: "管理員", editor: "內容編輯", operations: "運營" };
  return (
    <>
      <p className="eyebrow">工作臺</p>
      <h1>歡迎回來</h1>
      <p className="intro">當前身份：{roles[staff.role]} · 在這裏管理官網內容與日常運營。</p>
      <p className="notice dashboard-notice">支付渠道尚未開通。</p>
      {metrics.ok ? (
        <Metrics data={metrics.data} />
      ) : (
        <p role="alert">統計暫時不可用，請稍後刷新重試。</p>
      )}
      <SignOutButton />
    </>
  );
}
