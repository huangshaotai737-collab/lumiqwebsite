import 'server-only';
/** Existing page entries only; editor data cannot import arbitrary modules or routes. */
export const previewPages = {
  '/': () => import('@/app/page'),
  '/products': () => import('@/app/products/page'),
  '/products/ola': () => import('@/app/products/ola/page'),
  '/products/ola-go': () => import('@/app/products/ola-go/page'),
  '/products/tablet': () => import('@/app/products/tablet/page'),
  '/products/print': () => import('@/app/products/print/page'),
  '/products/nest': () => import('@/app/products/nest/page'),
  '/story': () => import('@/app/story/page'),
  '/about': () => import('@/app/about/page'),
  '/contact': () => import('@/app/contact/page'),
  '/plans': () => import('@/app/plans/page'),
  '/prelaunch': () => import('@/app/prelaunch/page'),
  '/members': () => import('@/app/[locale]/members/page'),
  '/faq': () => import('@/app/faq/page'),
  '/legal/privacy': () => import('@/app/legal/privacy/page'),
  '/legal/terms': () => import('@/app/legal/terms/page'),
  '/legal/cookies': () => import('@/app/legal/cookies/page'),
  '/legal/child-safety': () => import('@/app/legal/child-safety/page'),
};
