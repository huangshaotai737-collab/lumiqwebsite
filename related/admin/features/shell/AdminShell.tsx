'use client';

import Link from 'next/link';
import { useState } from 'react';

const modules = [
  ['官网内容', '文'],
  ['产品与方案', '品'],
  ['素材库', '图'],
  ['会员', '人'],
  ['候补名单', '单'],
  ['订单', '订'],
  ['团队与权限', '组'],
  ['系统设置', '设'],
] as const;

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="admin-shell" data-collapsed={collapsed}>
      <a className="skip-link" href="#workspace">跳至工作区</a>
      <aside className="sidebar" aria-label="管理导航">
        <span className="brand">LumiQ<small>管理后台</small></span>
        <button
          className="collapse-button"
          type="button"
          aria-label={collapsed ? '展开导航' : '折叠导航'}
          aria-expanded={!collapsed}
          aria-controls="admin-navigation"
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? '☰' : '‹'}</span>
        </button>
        <nav id="admin-navigation" aria-label="后台模块">
          <Link className="nav-item" href="/" aria-current="page" aria-label="工作台">
            <span className="nav-icon" aria-hidden="true">台</span><span className="nav-label">工作台</span>
          </Link>
          {modules.map(([label, icon]) => (
            <button className="nav-item" key={label} type="button" disabled aria-label={label} title="功能尚未开放">
              <span className="nav-icon" aria-hidden="true">{icon}</span><span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <p><strong>LumiQ 官网管理</strong>内容与运营工作区</p>
          <span className="status-pill">管理访问已关闭</span>
        </header>
        <main id="workspace" className="workspace-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
