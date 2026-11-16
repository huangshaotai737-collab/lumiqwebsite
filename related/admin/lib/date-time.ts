/** Match the dashboard timezone during SSR and client hydration. */
export function formatAdminDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});
}
