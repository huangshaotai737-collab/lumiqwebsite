import locations from './locations.json';
export const mediaPages = [
  ['/', '首頁'], ['/products', '產品總覽'], ['/products/tablet', 'Tablet 詳情頁'],
  ['/products/ola', 'Ola 詳情頁'], ['/products/ola-go', 'Go 詳情頁'],
  ['/products/nest', 'Orb 詳情頁'], ['/products/print', 'Print 詳情頁'],
  ['/story', '品牌故事'], ['/plans', '方案頁'], ['/members', '會員頁'],
  ['/about', '關於我們'], ['/contact', '聯絡我們'], ['/faq', '常見問題'],
  ['/prelaunch', '候補名單頁'], ['/legal/child-safety', '兒童安全'],
  ['/legal/cookies', 'Cookie 政策'], ['/legal/privacy', '隱私政策'],
  ['/legal/terms', '服務條款'], ['shared', '全站共用'],
] as const;
export function mediaPageKeys(key: string): string[] {
  const pages = locations[key as keyof typeof locations];
  // Site backgrounds and navigation are shared slots, not page-specific images.
  return pages.length > 5 || pages.some(page => page.startsWith('global')) ? ['shared'] : pages;
}
