'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { StaffRole } from '@/lib/generated/platform/core';
import { AdminIcon } from './AdminIcon';

const modules = [
  ['官网内容', '文'], ['产品与方案', '品'], ['素材库', '图'], ['会员', '人'],
  ['候补名单', '单'], ['订单', '订'], ['团队与权限', '组'], ['系统设置', '设'],
] as const;
const groups = [
  { label: '内容管理', items: ['官网内容', '素材库'] },
  { label: '业务运营', items: ['产品与方案', '会员', '候补名单', '订单'] },
  { label: '系统管理', items: ['团队与权限', '系统设置', '操作记录'] },
];
const roleLabels = { admin: '管理员', editor: '内容编辑', operations: '运营' };

export function AdminShell({ children, status = '管理访问已关闭', role }: Readonly<{ children: React.ReactNode; status?: string; role?: StaffRole }>) {
  const pathname = usePathname();
  const links = role ? [
    ...(role === 'admin' || role === 'editor' ? [['官网内容', '文', '/content'], ['素材库', '图', '/media']] : []),
    ...(role === 'admin' || role === 'operations' ? [['产品与方案', '品', '/catalog'], ['会员', '人', '/customers'], ['候补名单', '单', '/waitlist'], ['订单', '订', '/orders']] : []),
    ...(role === 'admin' ? [['团队与权限', '组', '/team'], ['系统设置', '设', '/settings']] : []),
    ['操作记录', '记', '/audit'],
  ] : [];
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
  const current = links.find(([, , href]) => active(href))?.[0] || '工作台';
  const entries = [...modules, ['操作记录', '记']];

  return <div className="admin-shell" data-collapsed={collapsed} data-mobile-open={mobileOpen}>
    <a className="skip-link" href="#workspace">跳至工作区</a>
    <aside className="sidebar" aria-label="管理导航">
      <div className="sidebar-heading">
        <span className="brand"><span className="brand-symbol"><AdminIcon name="layers"/></span><span className="brand-copy">LumiQ<span className="brand-dot">.</span><small>官网管理后台</small></span></span>
        <button className="collapse-button desktop-toggle" type="button" aria-label={collapsed ? '展开导航' : '折叠导航'} aria-expanded={!collapsed} aria-controls="admin-navigation" onClick={() => setCollapsed(value => !value)}><AdminIcon name="chevron"/></button>
        <button className="collapse-button mobile-toggle" type="button" aria-label={mobileOpen ? '折叠导航' : '展开导航'} aria-expanded={mobileOpen} aria-controls="admin-navigation" onClick={() => setMobileOpen(value => !value)}><AdminIcon name="menu"/></button>
      </div>
      <nav id="admin-navigation" aria-label="后台模块">
        <Link className="nav-item" href="/" aria-current={pathname === '/' ? 'page' : undefined} aria-label="工作台" title="工作台" onClick={() => setMobileOpen(false)}><span className="nav-icon"><AdminIcon name="台"/></span><span className="nav-label">工作台</span></Link>
        {groups.map(group => <div className="nav-group" key={group.label}>
          <p className="nav-group-label">{group.label}</p>
          {group.items.map(label => {
            const link = links.find(([name]) => name === label);
            const icon = entries.find(([name]) => name === label)?.[1] || '台';
            return link ? <Link className="nav-item" key={label} href={link[2]} aria-label={label} title={label} aria-current={active(link[2]) ? 'page' : undefined} onClick={() => setMobileOpen(false)}><span className="nav-icon"><AdminIcon name={icon}/></span><span className="nav-label">{label}</span></Link> : label !== '操作记录' && <button className="nav-item" key={label} type="button" disabled aria-label={label} title="功能尚未开放"><span className="nav-icon"><AdminIcon name={icon}/></span><span className="nav-label">{label}</span></button>;
          })}
        </div>)}
      </nav>
      <div className="sidebar-account"><span className="account-avatar">L</span><span className="account-copy"><strong>{role ? roleLabels[role] : '管理访问已关闭'}</strong><small>LumiQ 管理工作区</small></span></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="topbar-heading"><span>LumiQ 官网管理</span><span className="breadcrumb-divider">/</span><strong>{current}</strong></div><span className="status-pill" data-verified={Boolean(role)}><AdminIcon name="shield"/>{status}</span></header>
      <main id="workspace" className="workspace-content" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
