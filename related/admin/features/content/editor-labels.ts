import type { ContentField, ContentSnapshot } from '@/lib/generated/platform/content';
export type EditorField = Pick<ContentField, 'path' | 'pages' | 'type' | 'maxLength' | 'icuSignature' | 'mediaPurpose'>;
const locales: Record<string, string> = { en: '英文', 'zh-hant': '繁體中文', ja: '日文' };
const pageNames: Record<string, string> = {
  '/': '首頁', '/about': '關於我們', '/story': '品牌故事', '/contact': '聯繫我們', '/faq': '常見問題', '/plans': '方案介紹', '/prelaunch': '候補報名', '/members': '會員頁面',
  '/products': '產品總覽', '/products/ola': 'Ola 產品頁', '/products/ola-go': 'Ola Go 產品頁', '/products/tablet': 'Tablet 產品頁', '/products/print': 'Print 產品頁', '/products/nest': 'Orb 產品頁',
  '/legal/privacy': '隱私政策', '/legal/terms': '服務條款', '/legal/cookies': 'Cookie 政策', '/legal/child-safety': '兒童安全', 'global/navigation': '全站導航', 'global/footer': '全站頁腳', 'global/metadata': '搜索與分享信息',
};
const productLabels: Record<string, string> = { name: '產品名稱', shortName: '產品簡稱', category: '產品分類', contentStatus: '內容確認狀態', summary: '產品簡介', image: '產品圖片' };
const planLabels: Record<string, string> = { monthlyFee: '月費', freeTrial: '免費試用', kidProfile: '兒童檔案', classicalStory: '經典故事', characters: '角色數量', generation: '故事生成', reimagined: '故事改編', storyQuest: '故事探索', original: '原創故事', printAddon: '打印附加方案', character: '角色', voice: '語音', personality: '個性', reminder: '提醒', connect: '設備連接', dayLimit: '每日使用上限' };
const commonLabels: Record<string, string> = { title: '標題', subtitle: '副標題', headline: '主標題', heading: '標題', description: '說明文案', desc: '說明文案', intro: '介紹文案', body: '正文', text: '文案', label: '顯示名稱', name: '名稱', button: '按鈕文案', cta: '行動按鈕', primary: '主要按鈕文案', secondary: '次要按鈕文案', question: '問題', answer: '回答', q: '問題', a: '回答', email: '郵箱提示', placeholder: '輸入提示', caption: '圖片說明', eyebrow: '引導短句', tagline: '品牌短句' };
export function fieldValue(snapshot: ContentSnapshot, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, snapshot);
}
export function pageLabel(page: string) { return pageNames[page] || '頁面共用內容'; }
export function textExcerpt(value: unknown) {
  const text = typeof value === 'boolean' ? (value ? '是' : '否') : value == null ? '尚未填寫' : String(value);
  const characters = Array.from(text.replace(/\s+/g, ' ').trim());
  return characters.slice(0, 64).join('') + (characters.length > 64 ? '…' : '');
}
export function fieldLabel(field: EditorField, snapshot: ContentSnapshot): string {
  const parts = field.path.split('.');
  if (parts[0] === 'products') {
    if (parts[2] === 'highlights') return `產品賣點 ${Number(parts[3]) + 1}`;
    if (parts[2] === 'price') return parts[3] === 'kind' ? '參考價狀態' : '參考金額（美元）';
    return productLabels[parts[2]] || '產品展示內容';
  }
  if (parts[0] === 'settings' && parts[1] === 'contactText') return `聯繫介紹（${locales[parts[2]] || '共用'}）`;
  if (parts[0] === 'settings') return ({ siteUrl: '官網地址', supportEmail: '客服郵箱', contactText: '聯繫介紹' } as Record<string, string>)[parts[1]] || '公開設置';
  if (parts[0] === 'plans') {
    const plan = snapshot.plans[Number(parts[1])]; const group = plan?.group === 'ola' ? 'Ola 方案' : 'Tablet 方案';
    if (parts[2] === 'tiers') return `${group} · 檔位 ${Number(parts[3]) + 1} 名稱`;
    const row = plan?.rows[Number(parts[3])];
    return `${group} · ${planLabels[row?.id] || '方案功能'} · 檔位 ${Number(parts[5]) + 1}`;
  }
  if (parts[0] === 'media') return ({ url: '素材地址', alt: '替代文字', assetId: '素材編號' } as Record<string, string>)[parts[2]] || '素材引用';
  const leaf = parts[parts.length - 1].replace(/([a-z])([A-Z])/g, '$1_$2').split('_').pop()?.toLowerCase() || '';
  return commonLabels[leaf] || `文案：${textExcerpt(fieldValue(snapshot, field.path))}`;
}
export function fieldContext(field: EditorField, snapshot: ContentSnapshot, selectedPage = 'all') {
  const parts = field.path.split('.');
  const locale = parts[0] === 'messages' ? parts[1] : parts[0] === 'settings' && parts[1] === 'contactText' ? parts[2] : '';
  const product = parts[0] === 'products' ? snapshot.products[parts[1] as keyof ContentSnapshot['products']]?.name : '';
  const pages = selectedPage !== 'all' && field.pages.includes(selectedPage) ? [selectedPage, ...field.pages.filter(page => page !== selectedPage)] : field.pages;
  return [pages.slice(0, 2).map(pageLabel).join('、'), field.pages.length > 2 ? `另 ${field.pages.length - 2} 個頁面` : '', locales[locale] || '跨語種共用', product].filter(Boolean).join(' · ');
}
export function matchesField(field: EditorField, snapshot: ContentSnapshot, query: string, searchText = '') {
  const needle = query.trim().toLocaleLowerCase();
  return !needle || [field.path, fieldLabel(field, snapshot), fieldValue(snapshot, field.path), searchText].some(value => String(value ?? '').toLocaleLowerCase().includes(needle));
}

/** One mapping for both error navigation and the actual input's aria-invalid marker. */
export function fieldIssueTarget(path: string, snapshot: ContentSnapshot): { rowPath: string; controlPath: string } {
  const price = /^(products\.[^.]+\.price)(?:\.(amount|kind))?$/.exec(path);
  if (!price) return { rowPath: path, controlPath: path };
  const rowPath = `${price[1]}.kind`;
  const hasAmount = fieldValue(snapshot, rowPath) === 'usd';
  return { rowPath, controlPath: hasAmount && price[2] !== 'kind' ? `${price[1]}.amount` : rowPath };
}
