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
    return <p role="status">认证服务暂时不可用，请稍后重试。</p>;
  }
  const metrics = await getDashboard();
  const roles = { admin: "管理员", editor: "内容编辑", operations: "运营" };
  return (
    <>
      <p className="eyebrow">工作台</p>
      <h1>欢迎回来</h1>
      <p>当前身份：{roles[staff.role]}</p>
      <p>支付渠道尚未开通。</p>
      {metrics.ok ? (
        <Metrics data={metrics.data} />
      ) : (
        <p role="alert">统计暂时不可用，请稍后刷新重试。</p>
      )}
      <SignOutButton />
    </>
  );
}
