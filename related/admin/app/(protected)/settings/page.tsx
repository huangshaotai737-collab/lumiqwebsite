import Link from 'next/link';
import { requireStaff } from '@/lib/auth/require-staff';
import { configurationStatus } from '@/features/team/service';
export default async function SettingsPage() {
  try {
    await requireStaff(['admin']);
  } catch {
    return (
      <p role="alert">系统设置仅管理员可查看，请检查当前账号权限或稍后重试。</p>
    );
  }
  const status = configurationStatus();
  const labels = {
    authentication: '身份认证',
    email: '邀请邮件',
    storage: '素材存储',
    payments: '支付渠道',
  };
  return (
    <>
      <h1>系统设置</h1>
      <section className="panel">
        <h2>配置状态</h2>
        <p>
          只显示服务器配置是否存在；连通性以实际操作为准。密钥由服务器环境变量管理。
        </p>
        <dl>
          {Object.entries(status).map(([key, value]) => (
            <div key={key}>
              <dt>{labels[key as keyof typeof labels]}</dt>
              <dd>{value ? '已配置' : '未配置'}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="panel">
        <h2>官网地址与客服信息</h2>
        <p>
          联系方式由官网内容设置统一管理。请在内容草稿的“系统设置”分组编辑，保存后由管理员发布；历史版本可回滚。
        </p>
        <Link href="/content">前往内容设置</Link>
      </section>
      <section className="panel" id="payment-materials">
        <h2>支付接入准备</h2>
        <p>支付渠道尚未开通，本次不创建真实交易。</p>
        <a href="#payment-materials">查看接入材料</a>
        <ul>
          <li>企业主体与商户资质</li>
          <li>收款账户及结算币种</li>
          <li>客服、隐私与退款政策地址</li>
          <li>经确认的支付渠道与回调配置</li>
        </ul>
      </section>
    </>
  );
}
