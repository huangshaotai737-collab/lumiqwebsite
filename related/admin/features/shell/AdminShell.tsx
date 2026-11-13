'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { StaffRole } from '@/lib/generated/platform/core';
import { AdminIcon } from './AdminIcon';

const modules = [
  ['官網內容', '文'], ['產品與方案', '品'], ['素材庫', '图'], ['會員', '人'],
  ['候補名單', '单'], ['訂單', '订'], ['團隊與權限', '组'], ['系統設置', '设'],
] as const;
const groups = [
  { label: '內容管理', items: ['官網內容', '素材庫'] },
  { label: '業務運營', items: ['產品與方案', '會員', '候補名單', '訂單'] },
  { label: '系統管理', items: ['團隊與權限', '系統設置', '操作記錄'] },
];
const roleLabels = { admin: '管理員', editor: '內容編輯', operations: '運營' };

export function AdminShell({ children, status = '管理訪問已關閉', role }: Readonly<{ children: React.ReactNode; status?: string; role?: StaffRole }>) {
  const pathname = usePathname();
  const links = role ? [
    ...(role === 'admin' || role === 'editor' ? [['官網內容', '文', '/content'], ['素材庫', '图', '/media']] : []),
    ...(role === 'admin' || role === 'operations' ? [['產品與方案', '品', '/catalog'], ['會員', '人', '/customers'], ['候補名單', '单', '/waitlist'], ['訂單', '订', '/orders']] : []),
    ...(role === 'admin' ? [['團隊與權限', '组', '/team'], ['系統設置', '设', '/settings']] : []),
    ['操作記錄', '记', '/audit'],
  ] : [];
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
  const current = links.find(([, , href]) => active(href))?.[0] || '工作臺';
  const entries = [...modules, ['操作記錄', '记']];

  return <div className="admin-shell" data-collapsed={collapsed} data-mobile-open={mobileOpen}>
    <a className="skip-link" href="#workspace">跳至工作區</a>
    <aside className="sidebar" aria-label="管理導航">
      <div className="sidebar-heading">
        <span className="brand brand-official"><Image src="/brand/lumiq-logo-white-transparent-v2.png" alt="LUMIQ Studio" width={4096} height={1551} sizes="144px" priority className="brand-logo"/><small className="brand-caption">官網管理後臺</small></span>
        <button className="collapse-button desktop-toggle" type="button" aria-label={collapsed ? '展開導航' : '摺疊導航'} aria-expanded={!collapsed} aria-controls="admin-navigation" onClick={() => setCollapsed(value => !value)}><AdminIcon name="chevron"/></button>
        <button className="collapse-button mobile-toggle" type="button" aria-label={mobileOpen ? '摺疊導航' : '展開導航'} aria-expanded={mobileOpen} aria-controls="admin-navigation" onClick={() => setMobileOpen(value => !value)}><AdminIcon name="menu"/></button>
      </div>
      <nav id="admin-navigation" aria-label="後臺模塊">
        <Link className="nav-item" href="/" aria-current={pathname === '/' ? 'page' : undefined} aria-label="工作臺" title="工作臺" onClick={() => setMobileOpen(false)}><span className="nav-icon"><AdminIcon name="台"/></span><span className="nav-label">工作臺</span></Link>
        {groups.map(group => <div className="nav-group" key={group.label}>
          <p className="nav-group-label">{group.label}</p>
          {group.items.map(label => {
            const link = links.find(([name]) => name === label);
            const icon = entries.find(([name]) => name === label)?.[1] || '台';
            return link ? <Link className="nav-item" key={label} href={link[2]} aria-label={label} title={label} aria-current={active(link[2]) ? 'page' : undefined} onClick={() => setMobileOpen(false)}><span className="nav-icon"><AdminIcon name={icon}/></span><span className="nav-label">{label}</span></Link> : label !== '操作記錄' && <button className="nav-item" key={label} type="button" disabled aria-label={label} title="功能尚未開放"><span className="nav-icon"><AdminIcon name={icon}/></span><span className="nav-label">{label}</span></button>;
          })}
        </div>)}
      </nav>
      <div className="sidebar-account"><span className="account-avatar">L</span><span className="account-copy"><strong>{role ? roleLabels[role] : '管理訪問已關閉'}</strong><small>LumiQ 管理工作區</small></span></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="topbar-heading"><span>LumiQ 官網管理</span><span className="breadcrumb-divider">/</span><strong>{current}</strong></div><span className="status-pill" data-verified={Boolean(role)}><AdminIcon name="shield"/>{status}</span></header>
      <main id="workspace" className="workspace-content" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
