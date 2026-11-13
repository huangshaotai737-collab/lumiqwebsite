// Read-only production smoke check. No credentials, writes, or email requests.
const checks = [
  ['官网首页', 'https://lumiq-parallax-collab-public.vercel.app/zh-hant', 200, 'text/html'],
  ['官网产品页', 'https://lumiq-parallax-collab-public.vercel.app/en/products/nest', 200, 'text/html'],
  ['后台登录页', 'https://lumiq-admin-two.vercel.app/login', 200, 'text/html'],
  ['后台内容接口拒绝匿名', 'https://lumiq-admin-two.vercel.app/api/content/drafts', 401, 'application/json'],
  ['会员资料接口拒绝匿名', 'https://lumiq-parallax-collab-public.vercel.app/api/account/profile', 401, 'application/json'],
];
const results = await Promise.all(checks.map(async ([name, url, expected, type]) => {
  const started = performance.now();
  try {
    const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(30_000)});
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();
    const pass = response.status === expected && contentType.includes(type) && body.length > 0;
    return {name, url, result: pass ? 'PASS' : 'FAIL', status: response.status, expected,
      contentType, elapsedMs: Math.round(performance.now() - started)};
  } catch (error) {
    return {name, url, result: 'FAIL', error: error instanceof Error ? error.message : 'Request failed',
      elapsedMs: Math.round(performance.now() - started)};
  }
}));
console.log(JSON.stringify({checkedAt: new Date().toISOString(), results}, null, 2));
if (results.some(result => result.result !== 'PASS')) process.exitCode = 1;
