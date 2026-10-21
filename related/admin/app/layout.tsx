import type { Metadata } from 'next';
import './globals.css';
import './admin-ui.css';
import './visual-editor.css';

export const metadata: Metadata = {
  title: 'LumiQ 管理后台',
  description: 'LumiQ 官网员工管理平台',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
