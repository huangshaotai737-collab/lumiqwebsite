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
        <a href="#payment-preparation-checklist">查看接入材料与准备顺序</a>
        <div id="payment-preparation-checklist">
          <ol>
            <li>确认台湾收款主体、公司登记、负责人及收款账户资料；证件直接交支付平台。</li>
            <li>评估 PayPal、绿界等候选渠道，向渠道确认商户资格、销售市场、计价与结算币种及审核要求。</li>
            <li>确认正式 HTTPS 域名、客服、服务与隐私条款，以及配送、税费、退换货和退款政策。</li>
            <li>完成商户审核，再准备独立沙箱账户与沙箱凭据，验证金额、通知、查询及退款权限。</li>
            <li>沙箱验收通过后再准备正式凭据，由品牌方安排正式开通与验收；当前接口仍保持关闭。</li>
          </ol>
          <p>准备清单不代表商户已获批。单次硬件付款仍未接通；自动续费和付费订阅不在已实现范围。</p>
          <p>订单商品小计不是最终扣款额，运费、税费及最终应付额须确认并获得顾客同意。</p>
          <p>
            渠道资料：<a href="https://www.paypal.com/tw/business/open-business-account?locale.x=zh_TW">PayPal 台湾商业账户</a>
            {' · '}<a href="https://www.ecpay.com.tw/Business/payment_standard">绿界支付服务</a>
          </p>
        </div>
      </section>
    </>
  );
}
