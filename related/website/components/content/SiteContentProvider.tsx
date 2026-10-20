'use client';
import {createContext,useContext,type ReactNode} from 'react';
import type {ContentSnapshot} from '@/lib/generated/platform/content';
const Preview = createContext(false);
export function useContentPreview() { return useContext(Preview); }
const SiteContent = createContext<ContentSnapshot|null>(null);
export default function SiteContentProvider({snapshot,preview=false,children}:{snapshot:ContentSnapshot;preview?:boolean;children:ReactNode}) {
  return <Preview.Provider value={preview}><SiteContent.Provider value={snapshot}>{children}</SiteContent.Provider></Preview.Provider>;
}
export function useSiteContent():ContentSnapshot {
  const snapshot = useContext(SiteContent);
  if(!snapshot) throw Error('Site content requires SiteContentProvider');
  return snapshot;
}
