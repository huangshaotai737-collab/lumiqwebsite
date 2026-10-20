'use client';
import {useSyncExternalStore} from 'react';
const subscribe=()=>()=>{};
/** Server HTML and hydration snapshot remain disabled until handlers are attached. */
export function useHydrated(){return useSyncExternalStore(subscribe,()=>true,()=>false);}
