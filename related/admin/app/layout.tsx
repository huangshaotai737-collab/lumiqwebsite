import type { Metadata } from 'next';
import './globals.css';
import './admin-ui.css';
import './visual-editor.css';

export const metadata: Metadata = {
  title: 'LumiQ 管理後臺',
  description: 'LumiQ 官網員工管理平臺',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
