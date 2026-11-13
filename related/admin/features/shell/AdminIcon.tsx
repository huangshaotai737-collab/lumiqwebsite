import type { ReactNode } from 'react';

const shapes: Record<string, ReactNode> = {
  台: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  文: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>,
  品: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/></>,
  图: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
  人: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5.65"/></>,
  单: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 12h6M9 16h6"/></>,
  订: <><path d="M4 3h16v18l-4-2-4 2-4-2-4 2V3ZM8 8h8M8 12h8M8 16h4"/></>,
  组: <><circle cx="12" cy="7" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3M4 5a3 3 0 0 0 0 6M2 20v-2a5 5 0 0 1 3-4.6M20 5a3 3 0 0 1 0 6M22 20v-2a5 5 0 0 0-3-4.6"/></>,
  设: <><path d="m9 3-.6 2.4-2 .9-2.2-.6-2 3.5 1.6 1.8v2l-1.6 1.8 2 3.5 2.3-.6 2 .9L9 21h6l.6-2.4 2-.9 2.2.6 2-3.5-1.6-1.8v-2l1.6-1.8-2-3.5-2.2.6-2-.9L15 3H9Z"/><circle cx="12" cy="12" r="3"/></>,
  记: <><path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  chevron: <path d="m14 6-6 6 6 6"/>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  shield: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
  layers: <><path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/></>,
};

export function AdminIcon({ name, className }: { name: string; className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name] || shapes.台}</svg>;
}
