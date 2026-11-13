import Link from 'next/link';
import { requireStaff } from '@/lib/auth/require-staff';
import { configurationStatus } from '@/features/team/service';
export default async function SettingsPage() {
  try {
    await requireStaff(['admin']);
  } catch {
    return (
      <p role="alert">系統設置僅管理員可查看，請檢查當前賬號權限或稍後重試。</p>
    );
  }
  const status = configurationStatus();
  const labels = {
    authentication: '身份認證',
    email: '邀請郵件',
    storage: '素材存儲',
    payments: '支付渠道',
  };
  return (
    <>
      <h1>系統設置</h1>
      <section className="panel">
        <h2>配置狀態</h2>
        <p>
          只顯示服務器配置是否存在；連通性以實際操作爲準。密鑰由服務器環境變量管理。
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
        <h2>官網地址與客服信息</h2>
        <p>
          聯繫方式由官網內容設置統一管理。請在內容草稿的“系統設置”分組編輯，保存後由管理員發佈；歷史版本可回滾。
        </p>
        <Link href="/content">前往內容設置</Link>
      </section>
      <section className="panel" id="payment-materials">
        <h2>支付接入準備</h2>
        <p>支付渠道尚未開通，本次不創建真實交易。</p>
        <a href="#payment-preparation-checklist">查看接入材料與準備順序</a>
        <div id="payment-preparation-checklist">
          <ol>
            <li>確認臺灣收款主體、公司登記、負責人及收款賬戶資料；證件直接交支付平臺。</li>
            <li>評估 PayPal、綠界等候選渠道，向渠道確認商戶資格、銷售市場、計價與結算幣種及審覈要求。</li>
            <li>確認正式 HTTPS 域名、客服、服務與隱私條款，以及配送、稅費、退換貨和退款政策。</li>
            <li>完成商戶審覈，再準備獨立沙箱賬戶與沙箱憑據，驗證金額、通知、查詢及退款權限。</li>
            <li>沙箱驗收通過後再準備正式憑據，由品牌方安排正式開通與驗收；當前接口仍保持關閉。</li>
          </ol>
          <p>準備清單不代表商戶已獲批。單次硬件付款仍未接通；自動續費和付費訂閱不在已實現範圍。</p>
          <p>訂單商品小計不是最終扣款額，運費、稅費及最終應付額須確認並獲得顧客同意。</p>
          <p>
            渠道資料：<a href="https://www.paypal.com/tw/business/open-business-account?locale.x=zh_TW">PayPal 臺灣商業賬戶</a>
            {' · '}<a href="https://www.ecpay.com.tw/Business/payment_standard">綠界支付服務</a>
          </p>
        </div>
      </section>
    </>
  );
}
