// Generated from contracts/ by scripts/sync-platform-contracts.mjs. Do not edit.
/** Public, editable plan-preview copy. These strings never enable billing. */
export type BrandPlansTree = { [key: string]: string | BrandPlansTree };
export type BrandPlansLocale = 'en' | 'zh-hant' | 'ja';

export const brandPlansMessages: Record<BrandPlansLocale, BrandPlansTree> = {
  en: {
    productTabs: 'Compare subscription options',
    tabs: { one: 'LumiqOne', tablet: 'LumiqTablet', ola: 'LumiqOla' },
    previewLabel: 'Prelaunch preview',
    previewNotice: "Joining the waitlist does not place an order or charge you. Ordering is not open yet.",
    trialNotice: "The trial period starts after the user creates an account and activates the device. Monthly/yearly payments begin after subscribing to a plan. If the user cancels the subscription, automatic charges will not continue.",
    annualTotal: '{amount} total per year',
    perYear: '/ yr',
    included: 'Included',
    notIncluded: 'Not included',
    hardware: { msrp: 'MSRP', vip: 'VIP from', tabletMsrp: '599', olaMsrp: '899', tabletVip: '359', olaVip: '539' },
    tierDescriptions: {
      tabletFree: 'Free · Discover interactive reading', tabletLite: 'Lite · More stories and creative play', tabletPro: 'Pro · The full story and creation preview',
      olaFree: 'Free · Everyday conversation', olaPro: 'Pro · More personal companionship', one: 'Tablet Pro + Ola Pro in one plan',
    },
    one: { kicker: 'LumiqOne · Combined plan', title: 'Stories and companionship, together.', intro: 'Includes LumiqTablet Pro for children and parents, plus LumiqOla Pro for adults and older adults.', name: 'LumiqOne', tablet: 'LumiqTablet Pro', ola: 'LumiqOla Pro', trial: '7 days', tabletIncluded: 'Included', olaIncluded: 'Included' },
    tablet: { audience: 'Interactive reading for children and parents.', connect: 'Connect to LumiqOla', connection: 'Included' },
    ola: { audience: 'An AI companion for adults and older adults.', activeDetection: 'Active detection', minutesPerMonth: '{count} minutes / month', freeDetection: 'Not included', proDetection: 'Included' },
    prices: { one: { monthly: '35.99', yearly: '359.99' } },
  },
  'zh-hant': {
    productTabs: '比較訂閱方案',
    tabs: { one: 'LumiqOne', tablet: 'LumiqTablet', ola: 'LumiqOla' },
    previewLabel: '上市前預覽',
    previewNotice: "加入候補名單不會成立訂單或產生費用。目前尚未開放訂購。",
    trialNotice: "當用戶創建帳號且開通設備後開始計算試用期。訂閱方案後始開始按月/按年付款，若用戶取消訂閱，則不會繼續自動扣款。",
    annualTotal: '每年實付 {amount}',
    perYear: '/ 年',
    included: '包含',
    notIncluded: '不包含',
    hardware: { msrp: '建議售價', vip: 'VIP 起價', tabletMsrp: '599', olaMsrp: '899', tabletVip: '359', olaVip: '539' },
    tierDescriptions: {
      tabletFree: 'Free 免費方案 · 體驗互動閱讀', tabletLite: 'Lite 輕享方案 · 更多故事與創作', tabletPro: 'Pro 進階方案 · 完整故事與創作預覽',
      olaFree: 'Free 免費方案 · 日常對話', olaPro: 'Pro 進階方案 · 更貼近你的陪伴', one: '一個方案包含 Tablet Pro 與 Ola Pro',
    },
    one: { kicker: 'LumiqOne · 整合方案', title: '故事與陪伴，一起享有。', intro: '包含適合孩子與家長的 LumiqTablet Pro，以及適合成人與長者的 LumiqOla Pro。', name: 'LumiqOne', tablet: 'LumiqTablet Pro', ola: 'LumiqOla Pro', trial: '7 天', tabletIncluded: '包含', olaIncluded: '包含' },
    tablet: { audience: '適合孩子與家長的故事內容與互動閱讀。', connect: '連接 LumiqOla', connection: '包含' },
    ola: { audience: '適合成人與長者的 AI 陪伴方案。', activeDetection: '主動偵測', minutesPerMonth: '每月 {count} 分鐘', freeDetection: '不包含', proDetection: '包含' },
    prices: { one: { monthly: '35.99', yearly: '359.99' } },
  },
  ja: {
    productTabs: 'サブスクリプションを比較',
    tabs: { one: 'LumiqOne', tablet: 'LumiqTablet', ola: 'LumiqOla' },
    previewLabel: '発売前プレビュー',
    previewNotice: "ウェイトリストへの登録によって注文や請求が発生することはありません。現在、注文受付は開始していません。",
    trialNotice: "アカウントを作成し、デバイスを有効化した時点から試用期間が始まります。プランへの加入後に月払い／年払いが始まります。サブスクリプションを解約した場合、自動課金は継続されません。",
    annualTotal: '年間の支払総額 {amount}',
    perYear: '/ 年',
    included: '含まれます',
    notIncluded: '含まれません',
    hardware: { msrp: '希望小売価格', vip: 'VIP 最低価格', tabletMsrp: '599', olaMsrp: '899', tabletVip: '359', olaVip: '539' },
    tierDescriptions: {
      tabletFree: 'Free 無料プラン · インタラクティブ読書を体験', tabletLite: 'Lite ライトプラン · 物語と創作をもっと', tabletPro: 'Pro プロプラン · 物語と創作のフルプレビュー',
      olaFree: 'Free 無料プラン · 日常の会話', olaPro: 'Pro プロプラン · より身近なコンパニオン', one: 'Tablet Pro と Ola Pro をひとつに',
    },
    one: { kicker: 'LumiqOne · セットプラン', title: '物語とコンパニオンを、ひとつに。', intro: '子どもと保護者向けの LumiqTablet Pro と、大人とシニア向けの LumiqOla Pro が含まれます。', name: 'LumiqOne', tablet: 'LumiqTablet Pro', ola: 'LumiqOla Pro', trial: '7日間', tabletIncluded: '含まれます', olaIncluded: '含まれます' },
    tablet: { audience: '子どもと保護者のための物語とインタラクティブ読書。', connect: 'LumiqOla と接続', connection: '含まれます' },
    ola: { audience: '大人とシニアのための AI コンパニオン。', activeDetection: 'アクティブ検知', minutesPerMonth: '毎月{count}分', freeDetection: '含まれません', proDetection: '含まれます' },
    prices: { one: { monthly: '35.99', yearly: '359.99' } },
  },
};
