"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Profile} from '@/lib/generated/platform/core';
import {accountRevisionKey} from './session-event';

/** Only current verified server reads may reveal member data. Each uncertainty
 * invalidates every earlier read/save, including completions after unmount. */
export function useAccountIdentity(expectedUserId?: string | null) {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [generation,setGeneration]=useState(0);
  const epoch=useRef(0);
  const active=useRef(false);
  const invalidate=useCallback(()=>{
    const next=++epoch.current;
    setProfile(null);setGeneration(next);
    return next;
  },[]);
  const revalidate=useCallback(async()=>{
    const token=invalidate();
    try {
      const response=await fetch('/api/account/profile',{cache:'no-store'});
      const result=await response.json();
      if(!active.current || epoch.current!==token)return;
      if(response.ok && result.ok && (expectedUserId===undefined || result.data.userId===expectedUserId))setProfile(result.data);
    }catch{/* Uncertain identity remains hidden; focus/pageshow can retry. */}
  },[expectedUserId,invalidate]);
  useEffect(()=>{
    active.current=true;
    const check=()=>{void revalidate();};
    const storage=(event:StorageEvent)=>{if(event.key===accountRevisionKey || event.key===null)check();};
    const hide=()=>{invalidate();};
    window.addEventListener('storage',storage);
    window.addEventListener(accountRevisionKey,check);
    window.addEventListener('focus',check);
    window.addEventListener('pageshow',check);
    window.addEventListener('pagehide',hide);
    check();
    return ()=>{active.current=false;++epoch.current;window.removeEventListener('storage',storage);window.removeEventListener(accountRevisionKey,check);window.removeEventListener('focus',check);window.removeEventListener('pageshow',check);window.removeEventListener('pagehide',hide);};
  },[invalidate,revalidate]);
  const current=useCallback((token:number)=>active.current && epoch.current===token,[]);
  const save=useCallback((value:Profile,token:number)=>{if(current(token))setProfile(value);},[current]);
  return {profile,generation,current,save,invalidate,revalidate};
}
