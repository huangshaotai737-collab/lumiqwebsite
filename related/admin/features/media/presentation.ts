import profiles from './profiles.json';
import locations from './locations.json';
import { pageLabel } from '@/features/content/editor-labels';

const titles: Record<string, string> = {
  'evening': '晚間陪伴情境', 'morning': '早晨家庭情境', 'afternoon': '午後陪伴情境',
  'tablet-hero-original-transparent': 'Tablet 平板主視覺', 'tablet-three-quarter-transparent': 'Tablet 平板側面展示',
  'tablet-reading-lifestyle-v2': 'Tablet 閱讀使用情境', 'tablet-passive-new-scene-20261026': '傳統螢幕使用對照',
  'tablet-family-new-scene-20261026': '親子沉浸共讀對照', 'tablet-parent-controls-v2': '家長參與與使用管理',
  'tablet-growth': '成長地圖・父女共讀', 'tablet-stages': '不同年齡的閱讀陪伴',
  'tablet-pair': 'Tablet 正反面產品展示', 'lumiq-tablet': 'Tablet 平板產品圖',
  'imagime-v1': '故事探索・想像與創作',
  'ola-senior-reminder-v2': 'Ola 長輩日常提醒', 'ola-bedtime-story-v2': 'Ola 晚間陪伴',
  'ola-family-kitchen-v2': 'Ola 家庭廚房情境', 'ola-hero-front': 'Ola 正面產品圖',
  'ola-high-angle-crop': 'Ola 俯視產品展示', 'ola-original-transparent': 'Ola 透明底產品圖',
  'ola-repaired': 'Ola 產品展示', 'lumiq-ola-tablet-hero': 'Ola 與 Tablet 產品組合',
  'olago-home': 'Ola Go 居家・取出圓盤', 'olago-outdoor': 'Ola Go 外出・返家互動',
  'olago-journal': 'Ola Go 床邊日記', 'olago-weather': 'Ola Go 外出天氣提醒',
  'olago-connected': 'Ola Go 與 Ola 連接', 'olago-avatar': 'Ola Go 桌邊角色陪伴',
  'ola-go-schoolbag-v2': 'Ola Go 隨身背包情境', 'ola-go-return-home-v3': 'Ola Go 返家互動情境',
  'ola-go-bedside-journal-v3': 'Ola Go 床邊日記情境', 'ola-go-weather-walk-v2': 'Ola Go 散步情境',
  'ola-go-three-quarter': 'Ola Go 圓盤側面展示', 'lumiq-ola-go': 'Ola Go 圓盤產品圖',
  'orb-overview': 'Orb 家庭生活總覽', 'orb-calendar': 'Orb 家庭行事曆情境',
  'orb-chores': 'Orb 家務安排情境', 'nest-family-kitchen-v2': 'Orb 家庭廚房情境',
  'nest-routine-closeup-v2': 'Orb 日常安排特寫', 'nest15-angle-confirmed': 'Orb 產品展示',
  'nest15-oak-front': 'Orb 橡木色正面', 'nest15-oak-angle': 'Orb 橡木色側面',
  'nest15-walnut-front': 'Orb 胡桃木色正面', 'nest15-walnut-angle': 'Orb 胡桃木色側面',
  'nest15-black-front': 'Orb 黑色正面', 'nest15-black-angle': 'Orb 黑色側面', 'nest15-rear': 'Orb 背面結構',
  'cook': 'Orb 介面・烹飪', 'recipe': 'Orb 介面・食譜', 'calendar': 'Orb 介面・行事曆',
  'tasks': 'Orb 介面・家務任務', 'rewards': 'Orb 介面・獎勵目標', 'gallery': 'Orb 介面・相簿',
  'lumiq-print': 'Print 產品圖', 'reading': 'Print 閱讀情境', 'craft': 'Print 手作情境',
  'pages': 'Print 故事頁面', 'gift': 'Print 禮物情境',
  'lumiq-story-family-v3': '品牌故事・家庭共讀', 'lumiq-brand-film': '品牌故事影片',
  'room-full-4k': '家庭客廳全景', 'story-world-family': '安心陪伴・親子故事世界',
  'welcome-home': '歡迎回家', 'worlds-together': '一起探索故事世界', 'everyday-companion': '日常陪伴',
  'lumiq-logo-transparent-dark': 'LUMIQ 深色標誌', 'lumiq-logo-white-transparent-v2': 'LUMIQ 白色標誌',
  'poster-clean': '開場人物封面', 'settled-clean': '開場人物定格',
  'ola-girl-clean-alpha-safari': '開場透明人物・Safari', 'ola-girl-clean-alpha': '開場透明人物・WebM',
  'ola-scroll-v16-scrub': '首頁開場滾動影片', 'ola-scroll-v16-start-20260909': '首頁開場影片起始封面',
  'ola-scroll-v16-end-20260909': '首頁開場影片結束封面', 'version-5-tail-wave-20260914': '連續光帶背景影片',
  'join-crystal': '加入候補・水晶主視覺', 'pearl-light': '互動體驗・光球', 'go': '互動體驗・Ola Go',
  'print': '互動體驗・Print', 'ola-go-ui': '首頁 Ola 與 Go 介面',
  'hero-unified': '首頁開場背景', 'products': '產品區背景', 'family': '家庭生活區背景',
  'experiences': '互動體驗區背景', 'safety': '安心陪伴區背景', 'films': '影片區背景', 'join': '加入候補區背景',
  'about': '關於我們背景', 'story': '品牌故事背景', 'media': '媒體區背景', 'plans': '方案介紹背景',
  'prelaunch': '候補報名背景', 'faq': '常見問題背景', 'contact': '聯繫我們背景',
  'terms': '服務條款背景', 'cookies': 'Cookie 政策背景', 'child-safety': '兒童安全背景',
  'prelaunch-flow-clean': '候補報名・連續光帶', 'media-flow-clean': '媒體區・連續光帶',
  'faq-flow-clean': '常見問題・連續光帶', 'story-flow-clean': '品牌故事・連續光帶', 'plans-flow-clean': '方案介紹・連續光帶',
  'flow-01-low-arc': '光帶背景・低弧線', 'flow-02-diagonal-convergence': '光帶背景・斜向匯聚',
  'flow-03-open-loop': '光帶背景・舒展環形',
  '01-hero': 'Ola 首屏背景', '02-story': 'Ola 故事區背景', '03-scenes': 'Ola 使用情境背景',
  '04-features': 'Ola 功能區背景', '05-strengths': 'Ola 特色區背景', '06-final': 'Ola 頁尾背景',
  'nest-halo': 'Orb 產品光暈', 'tablet-halo': 'Tablet 產品光暈', 'print-halo': 'Print 產品光暈',
  'ola-halo': 'Ola 產品光暈', 'ola-go-halo': 'Ola Go 產品光暈',
};

export function mediaPresentation(key: string) {
  const profile = profiles[key as keyof typeof profiles];
  const path = profile.legacyUrl;
  const fileName = path.split('/').pop()!;
  const stem = fileName.replace(/\.[^.]+$/, '');
  const background = profile.profile === 'background';
  const group = background ? '背景與光帶'
    : /orb-ui|nest-detail|nest15-|product-scenes[^/]*\/orb-/.test(path) ? 'Orb'
    : /ola-go-detail|product-scenes[^/]*\/olago-|western-scenes[^/]*\/ola-go-/.test(path) ? 'Ola Go'
    : /tablet-detail|product-scenes[^/]*\/tablet-|western-scenes[^/]*\/tablet-/.test(path) ? 'Tablet'
    : /ola-detail|western-scenes[^/]*\/ola-/.test(path) ? 'Ola'
    : /print-detail/.test(path) ? 'Print'
    : /\/story\/|lumiq-story-family/.test(path) ? '品牌故事'
    : /\/brand\//.test(path) ? '品牌標誌' : /\/web\/|\/products\//.test(path) ? '產品共用' : '首頁';
  const format = 'readOnlyReason' in profile ? '透明人物・唯讀' : profile.kind === 'video' ? '影片' : profile.companions.length ? '影片封面' : background ? '背景圖片' : '圖片';
  const title = titles[stem]!;
  const variant = path.includes('/mobile-backgrounds') ? '手機版' : path.includes('/chapter-backgrounds') ? '桌面章節' : path.includes('/subpage-backgrounds-20260918') ? '連續光帶版' : '';
  const pages = locations[key as keyof typeof locations];
  const location = pages.length > 5 ? '多個頁面共用' : pages.map(pageLabel).join('、');
  return { title: `${title}${profile.kind === 'image' && profile.companions.length && !title.includes('封面') ? '・封面' : ''}${variant ? `（${variant}）` : ''}`, group, fileName, format, description: `${location} · ${format}${variant ? ` · ${variant}` : ''}` };
}

export function matchesMedia(profile: { key: string; title: string; group: string; description: string; fileName: string }, query: string, group: string) {
  const needle = query.trim().toLocaleLowerCase();
  return (!group || profile.group === group) && [profile.title, profile.group, profile.description, profile.fileName, profile.key].some(value => value.toLocaleLowerCase().includes(needle));
}
