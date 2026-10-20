import type { ContentField, ContentSnapshot } from '@/lib/generated/platform/content';
export type EditorField = Pick<ContentField, 'path' | 'pages' | 'type' | 'maxLength' | 'icuSignature' | 'mediaPurpose'>;
const locales: Record<string, string> = { en: '英文', 'zh-hant': '繁体中文', ja: '日文' };
const pageNames: Record<string, string> = {
  '/': '首页', '/about': '关于我们', '/story': '品牌故事', '/contact': '联系我们', '/faq': '常见问题', '/plans': '方案介绍', '/prelaunch': '候补报名', '/members': '会员页面',
  '/products': '产品总览', '/products/ola': 'Ola 产品页', '/products/ola-go': 'Ola Go 产品页', '/products/tablet': 'Tablet 产品页', '/products/print': 'Print 产品页', '/products/nest': 'Orb 产品页',
  '/legal/privacy': '隐私政策', '/legal/terms': '服务条款', '/legal/cookies': 'Cookie 政策', '/legal/child-safety': '儿童安全', 'global/navigation': '全站导航', 'global/footer': '全站页脚', 'global/metadata': '搜索与分享信息',
};
const productLabels: Record<string, string> = { name: '产品名称', shortName: '产品简称', category: '产品分类', contentStatus: '内容确认状态', summary: '产品简介', image: '产品图片' };
const planLabels: Record<string, string> = { monthlyFee: '月费', freeTrial: '免费试用', kidProfile: '儿童档案', classicalStory: '经典故事', characters: '角色数量', generation: '故事生成', reimagined: '故事改编', storyQuest: '故事探索', original: '原创故事', printAddon: '打印附加方案', character: '角色', voice: '语音', personality: '个性', reminder: '提醒', connect: '设备连接', dayLimit: '每日使用上限' };
const commonLabels: Record<string, string> = { title: '标题', subtitle: '副标题', headline: '主标题', heading: '标题', description: '说明文案', desc: '说明文案', intro: '介绍文案', body: '正文', text: '文案', label: '显示名称', name: '名称', button: '按钮文案', cta: '行动按钮', primary: '主要按钮文案', secondary: '次要按钮文案', question: '问题', answer: '回答', q: '问题', a: '回答', email: '邮箱提示', placeholder: '输入提示', caption: '图片说明', eyebrow: '引导短句', tagline: '品牌短句' };
export function fieldValue(snapshot: ContentSnapshot, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, snapshot);
}
export function pageLabel(page: string) { return pageNames[page] || '页面共用内容'; }
export function textExcerpt(value: unknown) {
  const text = typeof value === 'boolean' ? (value ? '是' : '否') : value == null ? '尚未填写' : String(value);
  const characters = Array.from(text.replace(/\s+/g, ' ').trim());
  return characters.slice(0, 64).join('') + (characters.length > 64 ? '…' : '');
}
export function fieldLabel(field: EditorField, snapshot: ContentSnapshot): string {
  const parts = field.path.split('.');
  if (parts[0] === 'products') {
    if (parts[2] === 'highlights') return `产品卖点 ${Number(parts[3]) + 1}`;
    if (parts[2] === 'price') return parts[3] === 'kind' ? '参考价状态' : '参考金额（美元）';
    return productLabels[parts[2]] || '产品展示内容';
  }
  if (parts[0] === 'settings' && parts[1] === 'contactText') return `联系介绍（${locales[parts[2]] || '共用'}）`;
  if (parts[0] === 'settings') return ({ siteUrl: '官网地址', supportEmail: '客服邮箱', contactText: '联系介绍' } as Record<string, string>)[parts[1]] || '公开设置';
  if (parts[0] === 'plans') {
    const plan = snapshot.plans[Number(parts[1])]; const group = plan?.group === 'ola' ? 'Ola 方案' : 'Tablet 方案';
    if (parts[2] === 'tiers') return `${group} · 档位 ${Number(parts[3]) + 1} 名称`;
    const row = plan?.rows[Number(parts[3])];
    return `${group} · ${planLabels[row?.id] || '方案功能'} · 档位 ${Number(parts[5]) + 1}`;
  }
  if (parts[0] === 'media') return ({ url: '素材地址', alt: '替代文字', assetId: '素材编号' } as Record<string, string>)[parts[2]] || '素材引用';
  const leaf = parts[parts.length - 1].replace(/([a-z])([A-Z])/g, '$1_$2').split('_').pop()?.toLowerCase() || '';
  return commonLabels[leaf] || `文案：${textExcerpt(fieldValue(snapshot, field.path))}`;
}
export function fieldContext(field: EditorField, snapshot: ContentSnapshot, selectedPage = 'all') {
  const parts = field.path.split('.');
  const locale = parts[0] === 'messages' ? parts[1] : parts[0] === 'settings' && parts[1] === 'contactText' ? parts[2] : '';
  const product = parts[0] === 'products' ? snapshot.products[parts[1] as keyof ContentSnapshot['products']]?.name : '';
  const pages = selectedPage !== 'all' && field.pages.includes(selectedPage) ? [selectedPage, ...field.pages.filter(page => page !== selectedPage)] : field.pages;
  return [pages.slice(0, 2).map(pageLabel).join('、'), field.pages.length > 2 ? `另 ${field.pages.length - 2} 个页面` : '', locales[locale] || '跨语种共用', product].filter(Boolean).join(' · ');
}
export function matchesField(field: EditorField, snapshot: ContentSnapshot, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  return !needle || [field.path, fieldLabel(field, snapshot), fieldValue(snapshot, field.path)].some(value => String(value ?? '').toLocaleLowerCase().includes(needle));
}
